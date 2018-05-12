# Wordpress Helper

Porting your data to FireBlog from Wordpress.

# Usage

Export the `.xml` file from Wordpress first, then ues this to translate that to FireBlogData.

```
npm install -g @foxzilla/wordpress-helper
wxr2fbd --help
```

# Example

```
npm install -g @foxzilla/wordpress-helper
wxr2fbd pea.wordpress.2018-02-20.xml --out out.fbd..json
```

There will generate the `out.fbd.json` file from `pea.wordpress.2018-02-20.xml`.
