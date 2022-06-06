import PropTypes from "prop-types";

import "./Footer.scss";

export const Footer = ({ children }) => (
    <footer className="footer">{children}</footer>
);

Footer.propTypes = {
    children: PropTypes.node,
};
