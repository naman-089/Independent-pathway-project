import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { IconClipboardList, IconMap2, IconUserCircle, IconBuildingCommunity } from "@tabler/icons-react";

export default function FamilyHome() {
  const { profile } = useAuth();
  const navigate    = useNavigate();
  const name        = profile?.displayName?.split(" ")[0] || "there";

  return (
    <div className="page">
      <div className="hero">
        <div className="hero-deco hero-deco-1" />
        <div className="hero-deco hero-deco-2" />
        <div className="hero-badge">Independence Pathway Platform</div>
        <h1>
          Welcome back, <em>{name}</em>.<br />
          The pathway before the pathway.
        </h1>
        <p>
          A proactive planning platform for individuals with developmental
          disabilities and their families — so that when transition happens,
          there's already a plan in place.
        </p>
        <button className="btn btn-primary" onClick={() => navigate("/family/intake")}>
          {profile?.intakeComplete ? "View My Pathway →" : "Start Your Intake →"}
        </button>
      </div>

      <div className="feature-grid">
        <div className="card card-hover feature-card" onClick={() => navigate("/family/intake")}>
          <div className="feature-icon"><IconClipboardList size={22} /></div>
          <h3>Intake Assessment</h3>
          <p>A holistic questionnaire covering vision, life skills, finances, and strengths — co-created with you.</p>
        </div>
        <div className="card card-hover feature-card" onClick={() => navigate("/family/timeline")}>
          <div className="feature-icon"><IconMap2 size={22} /></div>
          <h3>Independence Timeline</h3>
          <p>A personalized roadmap with milestones that track readiness and progress toward independent living.</p>
        </div>
        <div className="card card-hover feature-card" onClick={() => navigate("/family/portfolio")}>
          <div className="feature-icon"><IconUserCircle size={22} /></div>
          <h3>Digital Portfolio</h3>
          <p>A living record of achievements, skills, and routines — a verified blueprint caseworkers can rely on.</p>
        </div>
        <div className="card card-hover feature-card" onClick={() => navigate("/family/resources")}>
          <div className="feature-icon"><IconBuildingCommunity size={22} /></div>
          <h3>Resource Matches</h3>
          <p>Smart matching to Reena and partner organizations based on your actual needs and readiness.</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-num">52<em>K+</em></div>
          <div className="stat-label">Ontarians on the developmental services waitlist</div>
        </div>
        <div className="stat-card">
          <div className="stat-num"><em>$</em>2.9<em>B</em></div>
          <div className="stat-label">Spent annually — yet the waitlist grew 55% since 2018</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">0</div>
          <div className="stat-label">Existing platforms that hold the whole transition journey together</div>
        </div>
      </div>
    </div>
  );
}
