import React from "react";
import { Link } from "react-router-dom";
import AppLogo from "@/components/AppLogo";

const Footer = React.forwardRef<HTMLElement>((_, ref) => {
  return (
    <footer ref={ref} className="py-16" style={{ background: 'hsl(var(--navy-deep))', color: 'hsl(var(--primary-foreground) / 0.5)' }}>
      <div className="container">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <AppLogo variant="footer" linkTo="/" className="mb-4" />
            <p className="text-sm leading-relaxed">Global property management platform for landlords, tenants and concierge professionals.</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-sm mb-3" style={{ color: 'hsl(var(--primary-foreground))' }}>Product</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/#features" className="hover:text-primary-foreground transition-colors">Features</a></li>
              <li><a href="/#pricing" className="hover:text-primary-foreground transition-colors">Pricing</a></li>
              <li><Link to="/about" className="hover:text-primary-foreground transition-colors">About</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-sm mb-3" style={{ color: 'hsl(var(--primary-foreground))' }}>Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/terms" className="hover:text-primary-foreground transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/privacy" className="hover:text-primary-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/legal-notice" className="hover:text-primary-foreground transition-colors">Legal Notice</Link></li>
              <li><Link to="/cookies" className="hover:text-primary-foreground transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-sm mb-3" style={{ color: 'hsl(var(--primary-foreground))' }}>Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/help" className="hover:text-primary-foreground transition-colors">Help Center</Link></li>
              <li><Link to="/contact" className="hover:text-primary-foreground transition-colors">Contact</Link></li>
              <li><Link to="/developer" className="hover:text-primary-foreground transition-colors">API Access</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm mb-3" style={{ color: 'hsl(var(--primary-foreground))' }}>Contact</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="mailto:contact@easy-locs.com" className="hover:text-primary-foreground transition-colors">contact@easy-locs.com</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t pt-8 text-sm text-center" style={{ borderColor: 'hsl(var(--primary-foreground) / 0.1)' }}>
          © {new Date().getFullYear()} Easy-Locs®. All rights reserved.
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
