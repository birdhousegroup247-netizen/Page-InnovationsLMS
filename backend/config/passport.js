/**
 * Passport Configuration
 * Handles authentication strategies (JWT, Google OAuth)
 */

const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('../models');
const logger = require('../utils/logger');

// =============================================================================
// JWT STRATEGY
// =============================================================================

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

passport.use(
  new JwtStrategy(jwtOptions, async (jwt_payload, done) => {
    try {
      const user = await User.findByPk(jwt_payload.id, {
        attributes: { exclude: ['password_hash'] },
      });

      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (error) {
      return done(error, false);
    }
  })
);

// =============================================================================
// GOOGLE OAUTH 2.0 STRATEGY
// =============================================================================

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          logger.info(`Google OAuth attempt for email: ${profile.emails[0].value}`);

          const email = profile.emails[0].value;
          const fullName = profile.displayName;
          const googleId = profile.id;
          const profilePicture = profile.photos[0]?.value || null;

          // Check if user already exists with Google ID
          let user = await User.findOne({ where: { google_id: googleId } });

          if (user) {
            // User exists with Google ID - update last login
            await user.update({ last_login: new Date() });
            logger.info(`Existing Google user logged in: ${email}`);
            return done(null, user);
          }

          // Check if user exists with this email (registered normally)
          user = await User.findOne({ where: { email } });

          if (user) {
            // Link Google account to existing user
            await user.update({
              google_id: googleId,
              profile_picture: profilePicture || user.profile_picture,
              email_verified: true,
              last_login: new Date(),
            });
            logger.info(`Google account linked to existing user: ${email}`);
            return done(null, user);
          }

          // Create new user with Google account
          user = await User.create({
            full_name: fullName,
            email,
            google_id: googleId,
            profile_picture: profilePicture,
            role: 'student', // Default role for OAuth users
            is_active: true,
            email_verified: true, // Google emails are verified
            password_hash: null, // No password for OAuth users
            last_login: new Date(),
          });

          logger.info(`New user created via Google OAuth: ${email}`);

          // Send welcome email (optional)
          try {
            const emailService = require('../services/email/emailService');
            await emailService.sendWelcomeEmail(email, fullName);
          } catch (emailError) {
            logger.error('Failed to send welcome email:', emailError);
          }

          return done(null, user);
        } catch (error) {
          logger.error('Google OAuth error:', error);
          return done(error, false);
        }
      }
    )
  );
} else {
  logger.warn('Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

// =============================================================================
// PASSPORT SERIALIZATION (for sessions - optional)
// =============================================================================

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
