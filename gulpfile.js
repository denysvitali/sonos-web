/*
 * Sonos Web UI gulpfile.js
 * Based on @Falconerd gist: https://gist.github.com/Falconerd/3acc15f93b6a023e43b9
 */

var watchify = require('watchify');
var browserify = require('browserify');
var gulp = require('gulp');
var plumber = require('gulp-plumber');
// var uglify = require('gulp-uglify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var gutil = require('gulp-util');
var sourcemaps = require('gulp-sourcemaps');
var assign = require('lodash.assign');
var del = require('del');
var less = require('gulp-less');
var rename = require('gulp-rename');

var customOpts = {
    entries: ['./src/js/main.js'],
    debug: true,
    transform: [
        ['babelify', {
            presets: ['es2015'],
            ignore: ['./src/js/libs/**']
        }]
    ],
    ignore: ['./src/js/libs/**']
};
var opts = assign({}, watchify.args, customOpts);
var b = browserify(opts);
b.on('log', gutil.log);

/**
 * This task removes all files inside the 'public' directory.
 */
gulp.task('clean', function(cb) {
    'use strict';
    del.sync('./public/**/*');
    cb();
});

/**
 * This task will copy all files from libs into 'public/js/libs'.
 * If you want to process them, just add your code to this task.
 */
gulp.task('libs', gulp.series('clean'), function() {
    'use strict';
    return gulp.src(['./src/js/libs/**'])
        .pipe(plumber())
        .pipe(gulp.dest('./public/js/libs'));
});

/**
 * This task will copy all files from media into 'public/fonts'.
 * If you want to process them, just add your code to this task.
 */
gulp.task('media', gulp.parallel('libs'), function() {
    'use strict';
    return gulp.src(['./src/img/**'])
        .pipe(plumber())
        .pipe(gulp.dest('./public/img'));
});

/**
 * This task will copy all files from media into 'public/fonts'.
 * If you want to process them, just add your code to this task.
 */
gulp.task('fonts', gulp.parallel('media'), function() {
    'use strict';
    return gulp.src(['./src/fonts/**'])
        .pipe(plumber())
        .pipe(gulp.dest('./public/fonts'));
});

/**
 * This task will copy css files into 'public/css'
 * If you want to process it, just add your code to this task.
 */
gulp.task('css', gulp.parallel('fonts'), function() {
    'use strict';
    return gulp.src(['./src/css/**'])
        .pipe(plumber())
        .pipe(gulp.dest('./public/css'));
});

gulp.task('less', gulp.parallel('css'), function() {
    'use strict';
    gulp.src(['./plugins/*/**/*.less'])
      .pipe(less())
      .pipe(gulp.dest('./plugins/'));
    return gulp.src(['./src/less/*.less'])
        .pipe(less())
        .pipe(gulp.dest('./public/css'));
});

/**
 * This task will bundle all other js files and babelify them.
 * If you want to add other processing to the main js files, add your code here.
 */
gulp.task('bundle', gulp.parallel('less'), function() {
    'use strict';
    return b.bundle()
        .on('error', function(err) {
            console.log(err.message);
            this.emit('end');
        })
        .pipe(source('./src/js/main.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({
            loadMaps: true
        }))
        .pipe(sourcemaps.write('./'))
        .pipe(rename('app.min.js'))
        .pipe(gulp.dest('./public/js'));
});

/**
 * This task starts watching the files inside 'src'. If a file is changed,
 * removed or added then it will run refresh task which will run the bundle task
 * and then refresh the page.
 *
 * For large projects, it may be beneficial to separate copying of libs and
 * media from bundling the source. This is especially true if you have large
 * amounts of media.
 */
gulp.task('watch', gulp.parallel('bundle'), function() {
    'use strict';
    var watcher = gulp.watch(['./src/**/*','./plugins/**/*.less'], []);
    watcher.on('change', function(event) {
        console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
    });
});

/**
 * This is the default task which chains the rest.
 */
gulp.task('default', gulp.series('watch'));
