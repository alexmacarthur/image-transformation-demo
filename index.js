const prefix = "https://picperf.io";

function prefixCssUrls(cssString) {
  return cssString.replace(/url\((.*?)\)/g, (match, url) => {
    if (!url.startsWith(prefix)) {
      return `url(${prefix}/${url.trim()})`;
    }

    return match;
  });
}

class ElementHandler {
  element(element) {
    for (const [name, value] of element.attributes) {
      if (name === "src") {
        element.setAttribute("src", `${prefix}/${value}`);
      }

      if (name === "style") {
        element.setAttribute("style", prefixCssUrls(value));
      }
    }
  }
}

class StyleHandler {
  text(chunk) {
    chunk.replace(prefixCssUrls(chunk.text));
  }
}

export default {
  async fetch(request, _env, ctx) {
    ctx.passThroughOnException();

    if (request.method !== "GET") throw new Error("Not a GET!");

    const response = await fetch(request);

    const cachedResponse = await caches.default.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    let transformedResponse = new HTMLRewriter()
      .on("*", new ElementHandler())
      .transform(response);

    transformedResponse = new HTMLRewriter()
      .on("style", new StyleHandler())
      .transform(transformedResponse);

    ctx.waitUntil(caches.default.put(request, transformedResponse.clone()));

    return transformedResponse;
  },
};
