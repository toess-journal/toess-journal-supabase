import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { observeAuth } from "../../services/authService";
import {
  getReviewerAssignments,
  submitReview,
} from "../../services/reviewerService";
import { sendReviewSubmittedEmail } from "../../services/emailService";
import {
  FileText,
  Clock,
  CheckCircle,
  Star,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Download,
  User,
  Tag,
} from "lucide-react";

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

function StarRating({ value, onChange, label }) {
  return (
    <div>
      <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">{label}</p>
      <div className="flex gap-0.5 sm:gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded transition ${star <= value ? "text-yellow-400" : "text-gray-300"} hover:text-yellow-400`}
          >
            <Star className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
          </button>
        ))}
      </div>
      {value > 0 && (
        <p className="text-xs text-indigo-600 mt-0.5 font-medium">
          {RATING_LABELS[value]}
        </p>
      )}
    </div>
  );
}

function PaperDetails({ paper }) {
  if (!paper)
    return (
      <p className="text-sm text-gray-500 italic">Paper details not available.</p>
    );
  return (
    <div className="mt-4 pt-4 border-t space-y-4">
      <div className="flex flex-wrap gap-3 sm:gap-4 text-sm text-gray-600">
        {(paper.authorName || paper.authorEmail) && (
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="font-medium">{paper.authorName || paper.authorEmail}</span>
          </span>
        )}
        {paper.category && (
          <span className="flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>{paper.category}</span>
          </span>
        )}
      </div>
      {paper.abstract ? (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Abstract</p>
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">{paper.abstract}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">No abstract available.</p>
      )}
      {paper.keywords?.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Keywords</p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {paper.keywords.map((kw, i) => (
              <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full">{kw}</span>
            ))}
          </div>
        </div>
      )}
      {paper.fileUrl && (
        <a
          href={paper.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition"
        >
          <Download className="w-4 h-4" /> Download Full Paper
        </a>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  originalityRating: 0,
  methodologyRating: 0,
  clarityRating: 0,
  overallRating: 0,
  strengths: "",
  weaknesses: "",
  detailedComments: "",
  confidentialComments: "",
  recommendation: "",
};

export default function ReviewerDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [expandedPaper, setExpandedPaper] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [reviewForm, setReviewForm] = useState(EMPTY_FORM);

  useEffect(() => {
    const unsubscribe = observeAuth((user) => {
      if (!user) { navigate("/login"); return; }
      setCurrentUser(user);
      loadAssignments(user.email);
    });
    return () => unsubscribe();
  }, []);

  const loadAssignments = async (email) => {
    try {
      const data = await getReviewerAssignments(email);
      setAssignments(data.filter((a) => a.status !== "completed"));
    } catch (err) {
      console.error("Error loading assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => setReviewForm(EMPTY_FORM);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    const { originalityRating, methodologyRating, clarityRating, overallRating, recommendation } = reviewForm;
    if (!originalityRating || !methodologyRating || !clarityRating || !overallRating) {
      alert("Please provide all ratings."); return;
    }
    if (!recommendation) { alert("Please select a recommendation."); return; }
    if (!reviewForm.strengths.trim() || !reviewForm.weaknesses.trim() || !reviewForm.detailedComments.trim()) {
      alert("Please fill in strengths, weaknesses, and detailed comments."); return;
    }

    setSubmitting(true);
    try {
      await submitReview(selectedAssignment.id, {
        ...reviewForm,
        paperId: selectedAssignment.paper_id,
        reviewerEmail: currentUser.email,
        reviewerName: currentUser.displayName || currentUser.email,
      });
      try {
        await sendReviewSubmittedEmail({
          reviewerEmail: currentUser.email,
          reviewerName: currentUser.displayName || currentUser.email,
          paperId: selectedAssignment.paper_id,
          paperTitle: selectedAssignment.paper?.title || "Manuscript",
        });
      } catch (emailError) {
        console.warn("⚠️ Review submitted email failed (non-blocking):", emailError.message);
      }
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setSelectedAssignment(null);
        resetForm();
        loadAssignments(currentUser.email);
      }, 1800);
    } catch (err) {
      console.error(err);
      alert("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isOverdue = (a) => a.deadline && new Date(a.deadline) < new Date();

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin w-10 h-10 sm:w-12 sm:h-12 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3">
          <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 flex-shrink-0" />
          Reviewer Dashboard
        </h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base truncate">
          Welcome, {currentUser?.displayName || currentUser?.email}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: "Pending Reviews", value: assignments.length, icon: Clock,     color: "text-orange-500" },
          { label: "Total Assigned",  value: assignments.length, icon: FileText,  color: "text-indigo-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white p-4 sm:p-5 rounded-xl border shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${color} flex-shrink-0`} />
              <div>
                <div className="text-xl sm:text-2xl font-bold">{value}</div>
                <div className="text-xs sm:text-sm text-gray-500 leading-snug">{label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 sm:p-12 text-center text-gray-500">
          <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-green-300" />
          <p className="text-base sm:text-lg font-medium">All reviews completed!</p>
          <p className="text-sm mt-1">You have no pending papers to review.</p>
        </div>
      ) : (
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
            Papers Awaiting Your Review
          </h2>
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const paper = assignment.paper;
              const overdue = isOverdue(assignment);
              const isOpen = expandedPaper === assignment.id;

              return (
                <div
                  key={assignment.id}
                  className={`bg-white rounded-xl border-2 shadow-sm transition ${overdue ? "border-red-200" : "border-gray-100"}`}
                >
                  <div className="p-4 sm:p-5">
                    {/* Top row: title + badges */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base leading-snug">
                            {paper?.title || "Untitled Paper"}
                          </h3>
                          {overdue && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full flex-shrink-0">
                              <AlertCircle className="w-3 h-3" /> Overdue
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500">
                          Deadline:{" "}
                          <span className={`font-medium ${overdue ? "text-red-600" : "text-gray-700"}`}>
                            {assignment.deadline ? new Date(assignment.deadline).toLocaleDateString() : "N/A"}
                          </span>
                          {" · "}Assigned:{" "}
                          {assignment.assigned_at ? new Date(assignment.assigned_at).toLocaleDateString() : "N/A"}
                        </p>
                      </div>

                      {/* Action buttons: stack on mobile, row on sm+ */}
                      <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                        <button
                          onClick={() => setExpandedPaper(isOpen ? null : assignment.id)}
                          className="flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs sm:text-sm font-medium transition flex-1 sm:flex-none"
                        >
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          <span>{isOpen ? "Hide" : "View"}</span>
                        </button>
                        <button
                          onClick={() => { setSelectedAssignment(assignment); resetForm(); }}
                          className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs sm:text-sm font-medium transition flex-1 sm:flex-none"
                        >
                          <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span>Submit Review</span>
                        </button>
                      </div>
                    </div>

                    {isOpen && <PaperDetails paper={paper} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit Review Modal — bottom sheet on mobile, centered on sm+ */}
      {selectedAssignment && (
        <div style={{position:'fixed',inset:0,zIndex:9999,backgroundColor:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-end',justifyContent:'center'}} className="sm:items-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl shadow-2xl" style={{maxHeight:'95vh',overflowY:'auto'}}>

            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4 sm:p-6 rounded-t-2xl sticky top-0 z-10">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold">Submit Review</h2>
                  <p className="text-blue-100 text-xs sm:text-sm mt-1 line-clamp-2">
                    {selectedAssignment.paper?.title || "Untitled Paper"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {submitSuccess ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-6 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Review Submitted!</h3>
                <p className="text-gray-500 text-sm sm:text-base">Your review has been recorded successfully.</p>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">A confirmation email has been sent to you.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="p-4 sm:p-6 space-y-5 sm:space-y-6">

                {/* Ratings */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 sm:mb-4 text-sm sm:text-base">
                    Ratings{" "}
                    <span className="text-gray-400 font-normal text-xs sm:text-sm">(1 = Poor, 5 = Excellent)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4 sm:gap-5">
                    <StarRating label="Originality"       value={reviewForm.originalityRating}  onChange={(v) => setReviewForm((p) => ({ ...p, originalityRating: v }))} />
                    <StarRating label="Methodology"       value={reviewForm.methodologyRating}  onChange={(v) => setReviewForm((p) => ({ ...p, methodologyRating: v }))} />
                    <StarRating label="Clarity of Writing" value={reviewForm.clarityRating}     onChange={(v) => setReviewForm((p) => ({ ...p, clarityRating: v }))} />
                    <StarRating label="Overall Quality"   value={reviewForm.overallRating}      onChange={(v) => setReviewForm((p) => ({ ...p, overallRating: v }))} />
                  </div>
                </div>

                {/* Recommendation */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2 sm:mb-3 text-sm sm:text-base">Recommendation</h3>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { value: "accept",         label: "✓ Accept",         cls: "border-green-500 bg-green-50 text-green-700" },
                      { value: "minor-revision", label: "↻ Minor Revision", cls: "border-blue-500 bg-blue-50 text-blue-700" },
                      { value: "major-revision", label: "↻ Major Revision", cls: "border-orange-500 bg-orange-50 text-orange-700" },
                      { value: "reject",         label: "✕ Reject",         cls: "border-red-500 bg-red-50 text-red-700" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setReviewForm((p) => ({ ...p, recommendation: opt.value }))}
                        className={`p-2.5 sm:p-3 rounded-xl border-2 text-xs sm:text-sm font-medium transition ${
                          reviewForm.recommendation === opt.value
                            ? opt.cls
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text fields */}
                <div className="space-y-3 sm:space-y-4">
                  {[
                    { key: "strengths",           label: "Strengths",                                    placeholder: "Describe the key strengths of this paper...",      rows: 3 },
                    { key: "weaknesses",          label: "Weaknesses",                                   placeholder: "Describe areas that need improvement...",           rows: 3 },
                    { key: "detailedComments",    label: "Detailed Comments",                            placeholder: "Provide detailed comments for the authors...",      rows: 5 },
                    { key: "confidentialComments",label: "Confidential Comments (editors only — optional)", placeholder: "Comments only the editor will see...",           rows: 3, optional: true },
                  ].map(({ key, label, placeholder, rows, optional }) => (
                    <div key={key}>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                        {label} {!optional && <span className="text-red-500">*</span>}
                      </label>
                      <textarea
                        rows={rows}
                        required={!optional}
                        value={reviewForm[key]}
                        onChange={(e) => setReviewForm((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 focus:border-indigo-500 focus:outline-none text-xs sm:text-sm resize-none"
                        placeholder={placeholder}
                      />
                    </div>
                  ))}
                </div>

                {/* Footer buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAssignment(null)}
                    className="flex-1 py-2.5 sm:py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? "Submitting..." : "Submit Review"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}