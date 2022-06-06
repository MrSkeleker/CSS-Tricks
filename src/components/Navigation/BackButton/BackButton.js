import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

import './BackButton.scss';

export const BackButton = ({ to }) => (
    <Link className="back-link" to={to}>
        <FaArrowLeft />
    </Link>
);

BackButton.propTypes = {
    to: PropTypes.string.isRequired,
};
