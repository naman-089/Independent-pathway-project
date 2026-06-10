import { IconBrandInstagram } from "@tabler/icons-react";

export default function Footer() {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="footer-grid">

        {/* Reena contact + socials */}
        <div>
          <div className="footer-col-title">Reena</div>
          <span className="footer-text">927 Clark Ave W, Thornhill ON L4J 8G6</span>
          <div className="footer-inline-row">
            <span className="footer-text">📞 (905) 889-6484</span>
            <a href="https://www.reena.org" target="_blank" rel="noreferrer" className="footer-link">
              🌐 reena.org
            </a>
          </div>
          <div style={{ marginTop: 6 }}>
            <a
              href="https://www.instagram.com/independencepathwayplatform/"
              target="_blank" rel="noreferrer"
              className="footer-link footer-link-flex"
            >
              <IconBrandInstagram size={13} /> @independencepathwayplatform
            </a>
            <a
              href="https://www.instagram.com/reena_residential/"
              target="_blank" rel="noreferrer"
              className="footer-link footer-link-flex"
            >
              <IconBrandInstagram size={13} /> @reena_residential
            </a>
          </div>
        </div>

        {/* Key Resources */}
        <div>
          <div className="footer-col-title">Key Resources</div>
          <a href="https://www.ontario.ca/page/developmental-services-ontario" target="_blank" rel="noreferrer" className="footer-link">
            Developmental Services Ontario
          </a>
          <a href="https://www.ontario.ca/page/passport-program" target="_blank" rel="noreferrer" className="footer-link">
            Passport Funding Program
          </a>
          <a href="https://www.ontario.ca/page/ontario-disability-support-program" target="_blank" rel="noreferrer" className="footer-link">
            ODSP (Disability Support)
          </a>
          <a href="https://www.legalaid.on.ca" target="_blank" rel="noreferrer" className="footer-link">
            Legal Aid Ontario
          </a>
        </div>

        {/* Get Help */}
        <div>
          <div className="footer-col-title">Get Help</div>
          <div className="footer-help-row">
            <span className="footer-text">DSO Helpline</span>
            <a href="tel:18554640902" className="footer-link">1-855-464-0902</a>
          </div>
          <div className="footer-help-row">
            <span className="footer-text">Reena Info Line</span>
            <a href="tel:9058896484" className="footer-link">(905) 889-6484</a>
          </div>
          <div className="footer-help-row">
            <span className="footer-text">TTY / Relay</span>
            <span className="footer-text">711</span>
          </div>
        </div>

      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Independence Pathway Platform · Reena × York University C4 Design Lab</p>
        <p>Built with care for families navigating transition in Ontario.</p>
      </div>
    </footer>
  );
}
