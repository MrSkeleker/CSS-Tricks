import { Header } from "components/Header/Header";
import { PAGES } from "utils/pages";
import { Footer } from "components/Footer/Footer";
import { ScrollingContainer } from "./ScrollingContainer/ScrollingContainer";
import { ScrollingText } from "./ScrollingContainer/ScrollingText/ScrollingText";

import "./ScrollingTextPage.scss";

const DEFAULT_TEXT =
    "Lorem Ipsum is simply dummy text of the printing and typesetting industry.";
const SECTIONS = 11;

export const ScrollingTextPage = () => (
    <div id="scrolling-text-page">
        <Header title={PAGES.SCROLLING_TEXT_PAGE.TITLE} />
        <main>
            {[...Array(SECTIONS)].map((_element, index) => (
                <ScrollingContainer
                    key={index}
                    position={index}
                    divisions={SECTIONS}
                    text={DEFAULT_TEXT}
                />
            ))}
        </main>
        <Footer>
            <ScrollingText
                text={DEFAULT_TEXT}
                customClass="scrolling-text--bottom"
            />
        </Footer>
    </div>
);
