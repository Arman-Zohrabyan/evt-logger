export interface ClickEventData {
  tagName: string;
  id: string;
  className: string;
  name: string;
  text: string;
  href?: string;
  timestamp: number;
}

export class ClickCollector {
  private callback: (event: ClickEventData) => void;
  private clicks: ClickEventData[] = [];

  constructor(callback: (event: ClickEventData) => void) {
    this.callback = callback;
  }

  start(): void {
    document.addEventListener('click', this.handleClick, true);
  }

  stop(): void {
    document.removeEventListener('click', this.handleClick, true);
  }

  getClicks(): ClickEventData[] {
    return [...this.clicks];
  }

  clearClicks(): void {
    this.clicks = [];
  }

  private handleClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    if (!target) return;

    // Get className safely (SVG elements have className as SVGAnimatedString)
    let className = '';
    if (target.className) {
      if (typeof target.className === 'string') {
        className = target.className;
      } else if (typeof (target.className as any).baseVal === 'string') {
        // SVG element - className is SVGAnimatedString
        className = (target.className as any).baseVal;
      }
    }

    // Find closest clickable ancestor if target is not informative
    let clickTarget = target;
    if (!target.id && !className && !target.tagName) {
      const clickable = target.closest('a, button, [onclick], [role="button"]');
      if (clickable) {
        clickTarget = clickable as HTMLElement;
        if (clickTarget.className) {
          if (typeof clickTarget.className === 'string') {
            className = clickTarget.className;
          } else if ((clickTarget.className as any).baseVal !== undefined) {
            className = (clickTarget.className as any).baseVal;
          }
        }
      }
    }

    const clickData: ClickEventData = {
      tagName: clickTarget.tagName?.toLowerCase() || '',
      id: clickTarget.id || '',
      className: className,
      name: (clickTarget as HTMLInputElement).name || '',
      text: this.getElementText(clickTarget),
      timestamp: Date.now()
    };

    if (clickTarget.tagName?.toLowerCase() === 'a') {
      clickData.href = (clickTarget as HTMLAnchorElement).href || '';
    }

    this.clicks.push(clickData);
    this.callback(clickData);
  };

  private getElementText(element: HTMLElement): string {
    const text = element.innerText || element.textContent || '';
    return text.substring(0, 100).trim();
  }
}
