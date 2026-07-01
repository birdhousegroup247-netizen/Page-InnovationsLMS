import { useState, useEffect } from 'react';
import { knowledgeAPI } from '../lib/api';
import { BookOpen, Search, ArrowLeft, Clock } from 'lucide-react';
import { sanitizeHtml } from '../utils/sanitizeHtml';

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [popular, setPopular] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [articleLoading, setArticleLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchArticles();
    fetchPopular();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const r = await knowledgeAPI.getAll();
      setArticles(r.data.data?.articles || r.data.data || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  const fetchPopular = async () => {
    try {
      const r = await knowledgeAPI.getPopular();
      setPopular(r.data.data?.articles || r.data.data || []);
    } catch { /* silent */ }
  };

  const openArticle = async (slug) => {
    setArticleLoading(true);
    try {
      const r = await knowledgeAPI.getBySlug(slug);
      setSelected(r.data.data?.article || r.data.data);
    } catch { /* silent */ }
    setArticleLoading(false);
  };

  const filtered = articles.filter((a) =>
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.excerpt?.toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Knowledge Base
        </button>
        <h1 className="text-2xl font-bold text-white mb-2">{selected.title}</h1>
        {selected.updated_at && (
          <p className="text-xs text-text-secondary mb-6 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last updated {new Date(selected.updated_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
          </p>
        )}
        <div
          className="prose prose-invert max-w-none text-text-secondary leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(selected.content || selected.body || '') }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-1">
          <BookOpen className="w-6 h-6 text-brand-blue" /> Knowledge Base
        </h1>
        <p className="text-text-secondary text-sm">Guides, tutorials, and answers to common questions.</p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input
          type="text"
          placeholder="Search articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-white placeholder-text-secondary focus:outline-none focus:border-brand-blue transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Articles list */}
        <div className="md:col-span-2">
          {loading ? (
            <div className="text-center text-text-secondary py-12">Loading articles...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-text-secondary py-12">No articles found.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((article) => (
                <button
                  key={article.id}
                  onClick={() => openArticle(article.slug)}
                  className="w-full text-left bg-dark-800 border border-dark-700 rounded-xl p-4 hover:border-brand-blue/50 transition-colors group"
                >
                  <h3 className="text-white font-medium group-hover:text-brand-blue transition-colors mb-1">
                    {article.title}
                  </h3>
                  {article.excerpt && (
                    <p className="text-text-secondary text-sm line-clamp-2">{article.excerpt}</p>
                  )}
                  {article.category && (
                    <span className="mt-2 inline-block text-xs px-2 py-0.5 rounded-full bg-dark-700 text-text-secondary">
                      {article.category}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Popular sidebar */}
        {popular.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Popular</h2>
            <div className="space-y-2">
              {popular.slice(0, 6).map((article) => (
                <button
                  key={article.id}
                  onClick={() => openArticle(article.slug)}
                  className="w-full text-left text-sm text-text-secondary hover:text-white transition-colors py-1"
                >
                  {article.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {articleLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-blue border-r-transparent" />
        </div>
      )}
    </div>
  );
}
