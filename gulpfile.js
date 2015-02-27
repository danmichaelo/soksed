/* Modules
------------------------------------- */
var gulp        = require('gulp'),
    sass        = require('gulp-ruby-sass'),
    prefix      = require('gulp-autoprefixer'),
    livereload  = require('gulp-livereload'),
    uglify      = require('gulp-uglify'),
    concat      = require('gulp-concat'),
    rename      = require('gulp-rename'),
    jshint      = require('gulp-jshint'),
    path        = require('path');



/* Paths
------------------------------------- */
var assets      = '',
    jsDir       = assets + 'js/',
    srcDir      = assets + 'src/',
    scssSrcDir  = srcDir + 'scss/',
    jsSrcDir    = srcDir + 'js/',
    bowerDir    = assets + 'bower_components/';

/* Sass Task
------------------------------------- */
gulp.task('sass', function() {

  return sass('public/site.scss') 
  .on('error', function (err) {
    console.error('Error!', err.message);
  })
  .pipe(gulp.dest('public/build'))
  .pipe(livereload());

});

/* Concatenate & Minify JS
------------------------------------- */

gulp.task('scripts', function() {
  return gulp.src(['app/scripts/*.js', 'app/scripts/*/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(concat('app.js'))
    .pipe(gulp.dest('public/build'))
    .pipe(rename('app.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('public/build'))
    .pipe(livereload());
});

gulp.task('deps', function() {
  return gulp.src([
        'public/lib/jquery/dist/jquery.js',
        'public/lib/angular/angular.js',
        // 'public/lib/angular-route/angular-route.js',
        'public/lib/angular-sanitize/angular-sanitize.js',
        'public/lib/angular-cookies/angular-cookies.js',
        'public/lib/ngInfiniteScroll/build/ng-infinite-scroll.js',
        'public/lib/angular-hotkeys/build/hotkeys.js',
        'public/lib/angular-ui-router/release/angular-ui-router.js'
      ])
    .pipe(concat('deps.js'))
    .pipe(gulp.dest('public/build'))
    .pipe(rename('deps.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('public/build'))
});

/* Watch Task
------------------------------------- */

gulp.task('watch', function() {
  livereload.listen({
    basePath: path.join(__dirname, 'public'),
  });
  gulp.watch('public/*.scss', ['sass']);
  gulp.watch(['app/scripts/*.js', 'app/scripts/*/*.js'], ['scripts'])

  gulp.watch('**/*.html').on('change', function(file) {
    livereload.changed(file.path);
  });
});

/* Default Task
------------------------------------- */

gulp.task('default', ['deps', 'scripts', 'sass', 'watch'], function() {

});