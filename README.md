# Wordpress Helper

Porting your data to FireBlog from Wordpress.

# Usage

Export the `.xml` file from Wordpress first, then ues this to translate that to FireBlogData.

```
npm install -g wordpress-helper
wp2fb "export.from.wordpress.xml" --out "out.fb.json"
```

# Example

```
npm install -g wordpress-helper
wp2fb pea.wordpress.2018-02-20.xml --out out.fb.json
```

There will generate the `out.fb.json` file from `pea.wordpress.2018-02-20.xml`.
