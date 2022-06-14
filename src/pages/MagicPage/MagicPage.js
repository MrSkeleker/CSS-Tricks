import { useCallback } from "react";

import { Header } from "components/Header/Header";
import { PAGES } from "utils/pages";
import { Footer } from "components/Footer/Footer";
import { initializeSimulation } from "utils/fluidSimulation";

import "./MagicPage.scss";

export const MagicPage = () => {
    const canvasRef = useCallback(node => {
        if(node !== null) {
            initializeSimulation(node);
        }
    });

    return (
        <div id="magic-page">
            <Header title={PAGES.MAGIC_PAGE.TITLE} />
            <main>
                <canvas ref={canvasRef}></canvas>
            </main>
            <Footer></Footer>
        </div>
    );
};
