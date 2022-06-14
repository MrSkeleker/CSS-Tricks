import { Routes, Route } from "react-router"

import { PAGES } from "utils/pages"
import { HexagonPage } from "./HexagonPage/HexagonPage"
import { HomePage } from "./HomePage/HomePage"
import { MagicPage } from "./MagicPage/MagicPage"
import { RainPage } from "./RainPage/RainPage"
import { ScrollingTextPage } from "./ScrollingTextPage/ScrollingTextPage"
import { SoundWavePage } from "./SoundWavePage/SoundWavePage"

export const AppRoutes = () => (
    <Routes>
        <Route path={PAGES.HOME_PAGE.ROUTE} element={<HomePage />} />
        <Route path={PAGES.HEXAGON_PAGE.ROUTE} element={<HexagonPage />} />
        <Route path={PAGES.SOUNDWAVE_PAGE.ROUTE} element={<SoundWavePage />} />
        <Route path={PAGES.SCROLLING_TEXT_PAGE.ROUTE} element={<ScrollingTextPage />} />
        <Route path={PAGES.RAIN_PAGE.ROUTE} element={<RainPage />} />
        <Route path={PAGES.MAGIC_PAGE.ROUTE} element={<MagicPage />} />
    </Routes>
)