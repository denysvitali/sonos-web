package main

import (
	"github.com/alexflint/go-arg"
	"github.com/denysvitali/sonos-web/pkg/sonos_server"
	"github.com/sirupsen/logrus"
)

var args struct {
	Debug bool `args:"debug" default:"false"`
}

func main(){
	arg.MustParse(&args)
	err := sonos_server.New("0.0.0.0:8888", args.Debug)
	if err != nil {
		logrus.Fatalf("unable to start HTTP server: %v", err)
	}
}