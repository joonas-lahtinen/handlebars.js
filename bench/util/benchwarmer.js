
var Benchmark = require("benchmark");

var BenchWarmer = function(names) {
  this.benchmarks = [];
  this.currentBenches = [];
  this.names = [];
  this.times = {};
  this.minimum = Infinity;
  this.maximum = -Infinity;
  this.errors = {};
};

var print = require("sys").print;

BenchWarmer.prototype = {
  winners: function(benches) {
    return Benchmark.filter(benches, 'fastest');
  },
  suite: function(suite, fn) {
    this.suiteName = suite;
    this.times[suite] = {};
    this.first = true;

    var self = this;

    fn(function(name, benchFn) {
      self.push(name, benchFn);
    });
  },
  push: function(name, fn) {
    if(this.names.indexOf(name) == -1) {
      this.names.push(name);
    }

    var first = this.first, suiteName = this.suiteName, self = this;
    this.first = false;

    var bench = new Benchmark(fn, {
      name: this.suiteName + ": " + name,
      onComplete: function() {
        if(first) { self.startLine(suiteName); }
        self.writeBench(bench);
        self.currentBenches.push(bench);
      }, onError: function() {
        self.errors[this.name] = this;
      }
    });
    bench.suiteName = this.suiteName;
    bench.benchName = name;

    this.benchmarks.push(bench);
  },
  bench: function(callback) {
    var benchSize = 0, names = this.names, self = this, i, l;

    for(i=0, l=names.length; i<l; i++) {
      var name = names[i];

      if(benchSize < name.length) { benchSize = name.length; }
    }

    this.nameSize = benchSize + 2;
    this.benchSize = 20;
    var horSize = 0;

    this.startLine("ops/msec");
    horSize = horSize + this.benchSize;
    for(i=0, l=names.length; i<l; i++) {
      print(names[i] + new Array(this.benchSize - names[i].length + 1).join(" "));
      horSize = horSize + this.benchSize;
    }

    print("WINNER(S)");
    horSize = horSize + "WINNER(S)".length;

    print("\n" + new Array(horSize + 1).join("-"));

    Benchmark.invoke(this.benchmarks, {
      name: "run",
      onComplete: function() {
        self.startLine('');

        var errors = false, prop, bench;
        for(prop in self.errors) {
          if (self.errors.hasOwnProperty(prop)
              && self.errors[prop].error.message !== 'EWOT') {
            errors = true;
            break;
          }
        }

        if(errors) {
          print("\n\nErrors:\n");
          for(prop in self.errors) {
            if (self.errors.hasOwnProperty(prop)
                && self.errors[prop].error.message !== 'EWOT') {
              bench = self.errors[prop];
              print("\n" + bench.name + ":\n");
              print(bench.error.message);
              if(bench.error.stack) {
                print(bench.error.stack.join("\n"));
              }
              print("\n");
            }
          }
        }

        callback();
      }
    });

    print("\n");
  },
  startLine: function(name) {
    var winners = Benchmark.map(this.winners(this.currentBenches), function(bench) {
      return bench.name.split(": ")[1];
    });

    this.currentBenches = [];

    print(winners.join(", "));
    print("\n");
    var padding = Math.max(this.benchSize - name.length + 1, 0);
    name = name + new Array(padding).join(" ");
    print(name);
  },
  writeBench: function(bench) {
    var out;

    if(!bench.error) {
      var count = bench.hz,
          moe   = count * bench.stats.rme / 100,
          minimum,
          maximum;

      count = Math.round(count / 1000);
      moe = Math.round(moe / 1000);
      minimum = count - moe;
      maximum = count + moe;

      out = count + " ±" + moe + " (" + bench.cycles + ")";

      this.times[bench.suiteName][bench.benchName] = count;
      this.minimum = Math.min(this.minimum, minimum);
      this.maximum = Math.max(this.maximum, maximum);
    } else {
      if (bench.error.message === 'EWOT') {
        out = 'NA';
      } else {
        out = 'E';
      }
    }

    var padding = this.benchSize - out.length + 1;
    out = out + new Array(padding).join(" ");
    print(out);
  }
};

module.exports = BenchWarmer;
