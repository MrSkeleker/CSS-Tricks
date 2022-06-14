import { Header } from 'components/Header/Header';
import { PAGES } from 'utils/pages';

import "./HomePage.scss";
import { Gallery } from "components/Gallery/Gallery";
import { Link } from 'react-router-dom';

export const HomePage = () => {
    const items = [{
        id: 1,
        image: {src: '', alt: ''},
    }]

    return (
        <div id="home-page">
            <Header title={PAGES.HOME_PAGE.TITLE} />
            <Gallery items={items}/>
            <Link to={PAGES.HEXAGON_PAGE.ROUTE}>{PAGES.HEXAGON_PAGE.TITLE}</Link>
            <Link to={PAGES.SOUNDWAVE_PAGE.ROUTE}>{PAGES.SOUNDWAVE_PAGE.TITLE}</Link>
            <Link to={PAGES.SCROLLING_TEXT_PAGE.ROUTE}>{PAGES.SCROLLING_TEXT_PAGE.TITLE}</Link>
            <Link to={PAGES.RAIN_PAGE.ROUTE}>{PAGES.RAIN_PAGE.TITLE}</Link>
            <Link to={PAGES.MAGIC_PAGE.ROUTE}>{PAGES.MAGIC_PAGE.TITLE}</Link>
        </div>
    );
};
