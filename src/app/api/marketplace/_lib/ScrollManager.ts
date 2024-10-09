import { WebDriver, WebElement } from 'selenium-webdriver';

export class ScrollManager {
    private driver: WebDriver;

    constructor(driver: WebDriver) {
        this.driver = driver;
    }

    public async scrollAndCollectListings(
        processListings: (listings: WebElement[]) => Promise<void>,
        getListingElements: () => Promise<WebElement[]>,
        checkSeeMorePopup: () => Promise<boolean>,
        waitForNewContent: (listings: WebElement[]) => Promise<boolean>
    ): Promise<void> {
        const mainScrollableContainer = await this.findMainScrollableContainer();
        let previousScrollPosition: number = 0;
        if (mainScrollableContainer) {
            previousScrollPosition = await this.getScrollPosition(
                mainScrollableContainer
            );
        }

        while (true) {
            await checkSeeMorePopup();
            const listings = await getListingElements();

            if (listings.length === 0) {
                break;
            }

            await processListings(listings);

            if (!mainScrollableContainer) {
                break;
            }

            const newScrollPosition: number = await this.driver.executeScript(
                'arguments[0].scrollTop = Math.min(arguments[0].scrollHeight, arguments[0].scrollTop + (window.innerHeight * 2)); return arguments[0].scrollTop;',
                mainScrollableContainer
            );

            const newContentLoaded = await waitForNewContent(listings);

            await checkSeeMorePopup();

            if (newScrollPosition === previousScrollPosition) {
                break;
            }

            if (!newContentLoaded) {
                break;
            }

            previousScrollPosition = newScrollPosition;
        }
    }

    private async findMainScrollableContainer(): Promise<WebElement | null> {
        const script = `
          function findFirstYScrollableElement(minWidthPercent) {
              const elements = document.querySelectorAll('*');
              const minWidth = window.innerWidth * (minWidthPercent / 100);

              for (const element of elements) {
                  const style = window.getComputedStyle(element);
                  const overflowY = style.overflowY;
                  const elementWidth = element.getBoundingClientRect().width;

                  const isScrollable = overflowY === 'auto' || overflowY === 'scroll';
                  const hasMinWidth = elementWidth >= minWidth;
                  const isOverflowing = element.scrollHeight > element.clientHeight;

                  if (isScrollable && hasMinWidth && isOverflowing) {
                      return element;
                  }
              }
              return null;
          }
          return findFirstYScrollableElement(30);
        `;
        const mainScrollableContainer = await this.driver.executeScript(script);
        if (
            !mainScrollableContainer ||
            !(mainScrollableContainer instanceof WebElement)
        ) {
            return null;
        }
        return mainScrollableContainer;
    }

    private async getScrollPosition(
        mainScrollableContainer: WebElement
    ): Promise<number> {
        const scrollPosition = await this.driver.executeScript(
            'return arguments[0].scrollTop;',
            mainScrollableContainer
        );
        if (typeof scrollPosition !== 'number') {
            throw new Error('Could not get the scroll position.');
        }
        return scrollPosition;
    }
}
