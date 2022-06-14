import PropTypes from "prop-types";

import "./Footer.scss";

export const Footer = ({ children }) => (
    <footer className="footer">
        <div className="content">{children}</div>
    </footer>
);

Footer.propTypes = {
    children: PropTypes.node,
};
