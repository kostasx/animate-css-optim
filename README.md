## DESCRIPTION

Optimize [animate.css](http://daneden.github.io/animate.css/) stylesheets. Reduce filesize.

The [animate.css](https://github.com/daneden/animate.css) files *(animate.css, animate.min.css)* span about 3303 LOCs and come at 70KB and 56KB respectively, because they contain a myriad of usable animated classes. 

We can trim down these file sizes, by excluding the classes we don't use. 

**Example:** When performed on a site which used just 7 animate.css classes, the result was a decrease by 88% (Saved: 49.04 kB) on the production version *(animate.css)* and a reduced size of 87% (Saved: 60.78 kB) on the development / minified version *(animate.min.css)*;

## HOW DOES THIS WORKS?

1. The utility scrapes through a list of web pages provided by the user.
2. It then uses [cheerio](https://www.npmjs.com/package/cheerio) to find the elements that contain the `.animated` class used by the [animate.css](https://github.com/daneden/animate.css) library and create a list of the animation classes used on the web site.
3. It then creates a trimmed down version of the `animate.css`, which contains only the necessary CSS rules for the effects currently used.
4. It also produces a minified version using [clean-css](https://www.npmjs.com/package/clean-css).

## INSTALLATION / USAGE

+ Clone repo
```bash
git clone git@github.com:kostasx/animate-css-optim.git
```
+ Install dependencies
```bash
cd animate-css-optim
npm install
```
+ Open `config.js` and replace the sample URLs with the page URLs you want to be scanned for elements containing the `.animated` class.

+ Run the utility:
```bash
node optim.js
```
You will now have an `output` folder created containing the optimized versions of `animate.css` and `animate.min.css`, containing only the classes needed for the elements found to be using them.

## License
Animate.css is licensed under the MIT license. (http://opensource.org/licenses/MIT)

## TO DO

+ Add support for reading local files using `fs`.
+ Create a (drag-and-drop) GUI and turn this into a cross-platform desktop application based on [Node-Webkit](https://github.com/nwjs/nw.js/).
+ Add Tests!