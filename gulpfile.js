/*
 * Sonos Web UI gulpfile.js
 * Based on @Falconerd gist: https://gist.github.com/Falconerd/3acc15f93b6a023e43b9
 */

let watchify = require('watchify');
let gulp = require('gulp');
let plumber = require('gulp-plumber');
let bro = require('gulp-bro');
let babelify = require('babelify');
let sourcemaps = require('gulp-sourcemaps');
let assign = require('lodash.assign');
let del = require('del');
let less = require('gulp-less');
let rename = require('gulp-rename');

/**
 * This task removes all files inside the 'public' directory.
 */
gulp.task('clean', function (cb) {
    'use strict';
    del.sync('./public/**/*');
    cb();
});

/**
 * This task will copy all files from libs into 'public/js/libs'.
 * If you want to process them, just add your code to this task.
 */
gulp.task('libs', gulp.series('clean', function (cb) {
    'use strict';
    return gulp.src(['./src/js/libs/**'])
        .pipe(gulp.dest('./public/js/libs'));
}));

/**
 * This task will copy all files from media into 'public/fonts'.
 * If you want to process them, just add your code to this task.
 */
gulp.task('media', gulp.series('libs', function (cb) {
    'use strict';
    gulp.src(['./src/img/**'])
        .pipe(plumber())
        .pipe(gulp.dest('./public/img'));
    cb();
}));

/**
 * This task will copy all files from media into 'public/fonts'.
 * If you want to process them, just add your code to this task.
 */
gulp.task('fonts', gulp.series('media', function (cb) {
    'use strict';
    gulp.src(['./src/fonts/**'])
        .pipe(gulp.dest('./public/fonts'));
    cb();
}));

/**
 * This task will copy css files into 'public/css'
 * If you want to process it, just add your code to this task.
 */
gulp.task('css', gulp.series('fonts', function (cb) {
    'use strict';
    return gulp.src(['./src/css/**'])
        .pipe(gulp.dest('./public/css'));
}));

gulp.task('less', gulp.series('css', function () {
    'use strict';
    gulp.src(['./plugins/*/**/*.less'])
        .pipe(less())
        .pipe(gulp.dest('./plugins/'));
    return gulp.src(['./src/less/*.less'])
        .pipe(less())
        .pipe(gulp.dest('./public/css'));
}));

/**
 * This task will bundle all other js files and babelify them.
 * If you want to add other processing to the main js files, add your code here.
 */

gulp.task('bundle', gulp.series('less', () =>
    gulp.src('src/js/main.js')
        .pipe(bro({
            transform: [
                babelify.configure({ presets: ['es2015'] }),
                ['uglifyify', { global: true }]
            ]
        }))
        .pipe(rename('app.min.js'))
        .pipe(gulp.dest('./public/js'))))

/**
 * This task starts watching the files inside 'src'. If a file is changed,
 * removed or added then it will run refresh task which will run the bundle task
 * and then refresh the page.
 *
 * For large projects, it may be beneficial to separate copying of libs and
 * media from bundling the source. This is especially true if you have large
 * amounts of media.
 */
gulp.task('watch', gulp.series('bundle', function (cb) {
    'use strict';
    var watcher = gulp.watch(['./src/**/*', './plugins/**/*.less'], []);
    watcher.on('change', function (event) {
        console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
    });
}));

/**
 * This is the default task which chains the rest.
 */
gulp.task('default', gulp.series('watch'));
