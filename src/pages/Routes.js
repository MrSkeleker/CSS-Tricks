import { Routes, Route } from "react-router"

import { PAGES } from "utils/pages"
import { HexagonPage } from "./HexagonPage/HexagonPage"
import { HomePage } from "./HomePage/HomePage"
import { SoundWavePage } from "./SoundWavePage/SoundWavePage"

export const AppRoutes = () => (
    <Routes>
        <Route path={PAGES.HOME_PAGE.ROUTE} element={<HomePage />} />
        <Route path={PAGES.HEXAGON_PAGE.ROUTE} element={<HexagonPage />} />
        <Route path={PAGES.SOUNDWAVE_PAGE.ROUTE} element={<SoundWavePage />} />
    </Routes>
)