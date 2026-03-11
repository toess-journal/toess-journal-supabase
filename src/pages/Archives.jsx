import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import loadingAnimation from "../assets/lottie/loading.json";
import { getPublishedPapers } from "../services/submissionService";
import {
  Search, FileText, Calendar, Tag, BookOpen, Download,
  Filter, Award, Eye, X, Users, TrendingUp,
} from "lucide-react";

export default function Archives() {
  const [papers, setPapers]                 = useState([]);
  const [authReady, setAuthReady]           = useState(false);
  const [minTimerDone, setMinTimerDone]     = useState(false);
  const [search, setSearch]                 = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy]                 = useState("newest");
  const [selectedPaper, setSelectedPaper]   = useState(null);

  const loading = !authReady || !minTimerDone;

  const formatAuthors = (paper) => {
    if (paper.paper_authors?.length > 0)
      return paper.paper_authors.map((a) => a.full_name).join(", ");
    if (paper.users)
      return `${paper.users.given_name || ""} ${paper.users.family_name || ""}`.trim();
    return "Unknown author";
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Date unavailable";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch { return "Date unavailable"; }
  };

  useEffect(() => {
    const timer = setTimeout(() => setMinTimerDone(true), 2000);
    load();
    return () => clearTimeout(timer);
  }, []);

  const load = async () => {
    try {
      const data = await getPublishedPapers();
      setPapers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setAuthReady(true);
    }
  };

  const categories = [...new Set(papers.map((p) => p.category).filter(Boolean))].sort();

  let filtered = papers.filter((p) => {
    const authorText   = formatAuthors(p).toLowerCase();
    const keywordsText = Array.isArray(p.keywords)
      ? p.keywords.join(" ").toLowerCase()
      : typeof p.keywords === "string" ? p.keywords.toLowerCase() : "";
    const q = search.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      authorText.includes(q) ||
      keywordsText.includes(q) ||
      p.abstract?.toLowerCase().includes(q)
    );
  });

  if (selectedCategory !== "all")
    filtered = filtered.filter((p) => p.category === selectedCategory);

  filtered.sort((a, b) => {
    if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
    const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
    const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
    return sortBy === "oldest" ? dateA - dateB : dateB - dateA;
  });

  const stats = {
    total:      papers.length,
    categories: categories.length,
    thisYear:   papers.filter((p) => {
      const year = new Date(p.updated_at || p.created_at).getFullYear();
      return year === new Date().getFullYear();
    }).length,
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white px-4">
      <div className="w-48 sm:w-64">
        <Lottie animationData={loadingAnimation} loop={true} speed={3} />
        <p className="text-center text-gray-600 mt-4 font-medium text-sm sm:text-base">
          Loading publications...
        </p>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-r from-indigo-700 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 lg:py-16">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <BookOpen className="w-7 h-7 sm:w-10 sm:h-10 flex-shrink-0" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Published Archives</h1>
          </div>
          <p className="text-blue-100 text-sm sm:text-base lg:text-lg mb-6 sm:mb-8 max-w-3xl">
            Browse our collection of peer-reviewed research papers in evolutionary algorithms,
            artificial intelligence, and smart systems.
          </p>

          {/* Stats — 1-col on xs, 3-col on sm+ */}
          <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-6 mt-4 sm:mt-8">
            {[
              { icon: FileText,   value: stats.total,      label: "Published Papers" },
              { icon: TrendingUp, value: stats.thisYear,   label: "This Year" },
              { icon: Tag,        value: stats.categories, label: "Categories" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-200 flex-shrink-0" />
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold">{value}</div>
                    <div className="text-xs sm:text-sm text-blue-200">{label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* ── Search & Filters ── */}
        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-6 sm:mb-8">
          {/* Search bar */}
          <div className="mb-4 sm:mb-6 relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, author, keywords..."
              className="w-full border-2 border-gray-200 rounded-lg pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-sm sm:text-base focus:border-indigo-500 focus:outline-none transition"
            />
          </div>

          {/* Filters row — stacks on mobile */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-700 flex-shrink-0">
              <Filter className="w-4 h-4" /> Filters:
            </div>

            <div className="flex gap-2 flex-1 flex-wrap">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 min-w-0 border-2 border-gray-200 px-3 py-2 text-sm rounded-lg focus:border-indigo-500 focus:outline-none transition"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 min-w-0 border-2 border-gray-200 px-3 py-2 text-sm rounded-lg focus:border-indigo-500 focus:outline-none transition"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>

            <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0">
              {filtered.length} {filtered.length === 1 ? "paper" : "papers"}
            </span>
          </div>
        </div>

        {/* ── No Results ── */}
        {filtered.length === 0 && (
          <div className="text-center py-12 sm:py-16 bg-white rounded-xl shadow-sm border">
            <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No papers found</h3>
            <p className="text-gray-600 text-sm sm:text-base">Try adjusting your search or filters</p>
          </div>
        )}

        {/* ── Papers List ── */}
        <div className="grid gap-4 sm:gap-6">
          {filtered.map((p) => (
            <article key={p.id}
              className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-lg hover:border-indigo-200 transition-all duration-200">

              {/* Title */}
              <h2 className="text-base sm:text-xl font-bold text-gray-900 mb-2 hover:text-indigo-600 transition cursor-pointer leading-snug">
                {p.title}
              </h2>

              {/* Meta */}
              <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-3">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  <span className="line-clamp-1">{formatAuthors(p)}</span>
                </span>
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  {formatDate(p.updated_at || p.created_at)}
                </span>
              </div>

              {/* Category */}
              {p.category && (
                <span className="inline-block bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-semibold mb-3">
                  {p.category}
                </span>
              )}

              {/* Abstract */}
              {p.abstract && (
                <p className="text-gray-700 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4 line-clamp-3">
                  {p.abstract}
                </p>
              )}

              {/* Keywords */}
              {p.keywords && (Array.isArray(p.keywords) ? p.keywords.length : 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                  {(Array.isArray(p.keywords) ? p.keywords : p.keywords.split(","))
                    .slice(0, 5)
                    .map((kw, idx) => (
                      <span key={idx}
                        className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                        <Tag className="w-3 h-3" />
                        {typeof kw === "string" ? kw.trim() : kw}
                      </span>
                    ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-100">
                <button onClick={() => setSelectedPaper(p)}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition font-medium text-xs sm:text-sm flex-1 sm:flex-none">
                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  View Details
                </button>
                {p.file_url && (
                  <a href={p.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-medium text-xs sm:text-sm shadow-sm flex-1 sm:flex-none">
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Download PDF
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* ── Detail Modal — bottom sheet on mobile ── */}
      {selectedPaper && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl">

            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4 sm:p-6 rounded-t-2xl z-10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-xl lg:text-2xl font-bold mb-1 sm:mb-2 leading-snug">
                    {selectedPaper.title}
                  </h2>
                  <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-blue-100">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="line-clamp-1">{formatAuthors(selectedPaper)}</span>
                    </span>
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      {formatDate(selectedPaper.updated_at || selectedPaper.created_at)}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedPaper(null)}
                  className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition flex-shrink-0">
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">

              {/* Publication Info */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg text-sm">
                {[
                  selectedPaper.category    && { label: "Category",       value: selectedPaper.category },
                  selectedPaper.article_type && { label: "Article Type",  value: selectedPaper.article_type },
                  selectedPaper.status === "published" && { label: "Status", value: "Published" },
                  selectedPaper.updated_at  && { label: "Published Date", value: formatDate(selectedPaper.updated_at) },
                ].filter(Boolean).map(({ label, value }) => (
                  <div key={label}>
                    <span className="text-xs sm:text-sm font-semibold text-gray-600 block mb-0.5">{label}</span>
                    <p className="text-gray-900 text-xs sm:text-sm">{value}</p>
                  </div>
                ))}
              </div>

              {/* Abstract */}
              {selectedPaper.abstract && (
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3">Abstract</h3>
                  <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">{selectedPaper.abstract}</p>
                </div>
              )}

              {/* Keywords */}
              {selectedPaper.keywords && (Array.isArray(selectedPaper.keywords) ? selectedPaper.keywords.length : 0) > 0 && (
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3">Keywords</h3>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {(Array.isArray(selectedPaper.keywords)
                      ? selectedPaper.keywords
                      : selectedPaper.keywords.split(",")
                    ).map((kw, idx) => (
                      <span key={idx}
                        className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2.5 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium">
                        <Tag className="w-3 h-3" />
                        {typeof kw === "string" ? kw.trim() : kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Authors */}
              {selectedPaper.paper_authors?.length > 0 && (
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3">Authors</h3>
                  <div className="space-y-2 sm:space-y-3">
                    {selectedPaper.paper_authors.map((author, idx) => (
                      <div key={idx} className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {(author.full_name?.[0] || "?").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm sm:text-base">
                            {author.full_name}
                            {author.is_corresponding && (
                              <span className="text-xs text-indigo-600 ml-2">(Corresponding)</span>
                            )}
                          </p>
                          {author.institution && (
                            <p className="text-xs sm:text-sm text-gray-600 truncate">{author.institution}</p>
                          )}
                          {author.email && (
                            <p className="text-xs sm:text-sm text-gray-500 truncate">{author.email}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
                <button onClick={() => setSelectedPaper(null)}
                  className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition font-medium text-sm">
                  Close
                </button>
                {selectedPaper.file_url && (
                  <a href={selectedPaper.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-medium shadow-lg text-sm">
                    <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                    Download Full Paper
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}