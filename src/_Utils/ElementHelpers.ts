export function AppendStyle(id: string, content: string, contentIsUrl: boolean = false) {
    let el = document.head.querySelector(`#${id}`);
    if (!el) {
        if (contentIsUrl) {
            el = document.createElement("link");
            (<HTMLLinkElement>el).rel = "stylesheet";
            (<HTMLLinkElement>el).href = content;
        } else {
            el = document.createElement("style");
            el.textContent = content;
        }
        el.id = id;
        document.head.append(el);
    }
}

export function AppendScript(id: string, content: string, contentIsUrl: boolean = false) {
    let el = document.body.querySelector(`#${id}`);
    if (!el) {
        el = document.createElement("script");
        el.id = id;
        if (contentIsUrl) {
            (<HTMLScriptElement>el).src = content;
        } else {
            el.textContent = content;
        }
        document.body.append(el);
    }
}