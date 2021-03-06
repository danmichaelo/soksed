/* Modules
------------------------------------- */
var gulp        = require('gulp'),
    sass        = require('gulp-sass'),
    prefix      = require('gulp-autoprefixer'),
    livereload  = require('gulp-livereload'),
    uglify      = require('gulp-uglify'),
    sourcemaps  = require('gulp-sourcemaps'),
    concat      = require('gulp-concat'),
    rename      = require('gulp-rename'),
    jshint      = require('gulp-jshint'),
    path        = require('path'),
    templateCache = require('gulp-angular-templatecache');


/* Paths
------------------------------------- */
var assets      = '',
    jsDir       = assets + 'js/',
    srcDir      = assets + 'src/',
    scssSrcDir  = srcDir + 'scss/',
    jsSrcDir    = srcDir + 'js/',
    bowerDir    = assets + 'bower_components/';

/* Linting
------------------------------------- */
gulp.task('lint', function () {
    return gulp.src('app/scripts/**/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
});

/* Sass Task
------------------------------------- */
gulp.task('sass', function() {

  return gulp.src('public/site.scss')
      .pipe(sass().on('error', sass.logError))
      .pipe(gulp.dest('public/build'))
      .pipe(livereload());

});

/* Templates
------------------------------------- */

gulp.task('templates', function () {
  return gulp.src('public/partials/**/*.html')
    .pipe(templateCache({standalone: true}))
    .pipe(gulp.dest('public/build'));
});

/* Concatenate & Minify JS
------------------------------------- */

gulp.task('scripts', ['lint', 'templates'], function() {
  return gulp.src([
          'public/build/templates.js',
          'app/scripts/*.js',
          'app/scripts/*/*.js',
    ])
    .pipe(sourcemaps.init())
    .pipe(concat('app.js'))
    .pipe(gulp.dest('public/build'))
    // .pipe(ngAnnotate())
    .pipe(uglify())
    .pipe(rename({ suffix: '.min' }))
    .pipe(sourcemaps.write('.'))  // Write external source map file
    .pipe(gulp.dest('public/build'))
    .pipe(livereload());
});

gulp.task('deps', function() {
  return gulp.src([
        // 'public/lib/angular-route/angular-route.js',
        //'public/lib/ngInfiniteScroll/build/ng-infinite-scroll.js',
        'public/lib/jquery/dist/jquery.js',
        'public/lib/angular/angular.js',
        'public/lib/angular-sanitize/angular-sanitize.js',
        'public/lib/angular-cookies/angular-cookies.js',
        'public/lib/angular-hotkeys/build/hotkeys.js',
        'public/lib/angular-ui-router/release/angular-ui-router.js',
        'public/lib/angular-vs-repeat/src/angular-vs-repeat.js',
        'public/lib/angular-tooltips/dist/angular-tooltips.js',
        'public/lib/angucomplete-alt/dist/angucomplete-alt.min.js',
      ])
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(concat('deps.js'))
    .pipe(gulp.dest('public/build'))
    .pipe(rename('deps.min.js'))
    .pipe(uglify())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('public/build'))
});

/* Watch Task
------------------------------------- */

gulp.task('watch', ['build'], function() {
  livereload.listen({
    basePath: path.join(__dirname, 'public'),
  });
  gulp.watch('public/*.scss', ['sass']);
  gulp.watch(['app/scripts/*.js', 'app/scripts/*/*.js'], ['scripts'])

  gulp.watch('**/*.html').on('change', function(file) {
    livereload.changed(file.path);
  });
});

/* Build Task
------------------------------------- */

gulp.task('build', ['deps', 'scripts', 'sass']);

/* Default Task
------------------------------------- */

gulp.task('default', ['build']);
