import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import { classNames } from "utils/styles";

import "./NavigationLink.scss";

export const NavigationLink = ({ label, to, withUnderline, variant }) => {
    const classes = ["link", { [`link--${variant}`]: variant }];

    return (
        <Link to={to} className={classNames(classes)}>
            <span className="link__label">{label}</span>
            {withUnderline && <span className="link__underline" />}
        </Link>
    );
};

NavigationLink.propTypes = {
    label: PropTypes.string.isRequired,
    to: PropTypes.string.isRequired,
    variant: PropTypes.string,
    withUnderline: PropTypes.bool,
};
