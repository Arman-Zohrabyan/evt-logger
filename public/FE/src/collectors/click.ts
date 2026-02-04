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

    const clickData: ClickEventData = {
      tagName: target.tagName?.toLowerCase() || '',
      id: target.id || '',
      className: target.className || '',
      name: (target as HTMLInputElement).name || '',
      text: this.getElementText(target),
      timestamp: Date.now()
    };

    if (target.tagName?.toLowerCase() === 'a') {
      clickData.href = (target as HTMLAnchorElement).href || '';
    }

    this.clicks.push(clickData);
    this.callback(clickData);
  };

  private getElementText(element: HTMLElement): string {
    const text = element.innerText || element.textContent || '';
    return text.substring(0, 100).trim();
  }
}
