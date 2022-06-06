import PropTypes from "prop-types";
import { useMatch } from "react-router";

import { BackButton } from "components/Navigation/BackButton/BackButton";
import { PAGES } from "utils/pages";

import "./Header.scss";

export const Header = ({ title }) => {
    const isHomepage = useMatch(PAGES.HOME_PAGE.ROUTE);

    return (
        <header className="header">
            <h1 className="header__title">{title}</h1>
            {!isHomepage && (
                <div className="header__actions">
                    <BackButton to={PAGES.HOME_PAGE.ROUTE} />
                </div>
            )}
        </header>
    );
};

Header.propTypes = {
    title: PropTypes.string.isRequired,
};
