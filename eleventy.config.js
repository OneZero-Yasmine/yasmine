import site from "./src/_data/site.json" with { type: "json" };

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/.nojekyll": ".nojekyll" });

  eleventyConfig.addFilter("asArray", (value) => Object.values(value ?? {}));
  eleventyConfig.addFilter("pad2", (value) => String(value).padStart(2, "0"));
  eleventyConfig.addFilter("absoluteUrl", (value) =>
    new URL(String(value ?? "").replace(/^\//, ""), site.baseUrl).href
  );

  return {
    pathPrefix: "/yasmine/",
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"]
  };
}
