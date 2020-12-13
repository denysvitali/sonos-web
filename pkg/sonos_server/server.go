package sonos_server

import (
	"fmt"
	"github.com/denysvitali/sonos"
	sonosweb "github.com/denysvitali/sonos-web/pkg"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"net/http"
)

type SonosServer struct {
	devices []*sonos.ZonePlayer
	log *logrus.Logger
}

func New(listenAddr string, debugMode bool) error {
	ss := SonosServer{
		devices: []*sonos.ZonePlayer{},
		log: logrus.New(),
	}
	
	var err error
	ss.devices, err = sonosweb.Discover()
	if err != nil {
		return fmt.Errorf("unable to scan for Sonos devices: %v", err)
	}

	if !debugMode {
		gin.SetMode(gin.ReleaseMode)
	} else {
		ss.log.SetLevel(logrus.DebugLevel)
	}
	
	r := gin.New()
	api :=  r.Group("/api")
	{
		v1 := api.Group("/v1")
		ss.mountV1Routes(v1)
	}
	return r.Run(listenAddr)
}

func (ss *SonosServer) mountV1Routes(v1 *gin.RouterGroup) {
	ss.coordinatorsV1(v1.Group("/coordinators"))
}

func (ss *SonosServer) coordinatorsV1(coordinators *gin.RouterGroup) {
	coordinators.GET("/", func(ctx *gin.Context){
		ctx.JSON(http.StatusOK, ss.createCoordinatorsResponse())
	})

	coordinators.GET("/:id", func(ctx *gin.Context){
		ctx.JSON(http.StatusOK, ss.getCoordinator(ctx.Param("id")))
	})

	coordinators.GET("/:id/playing", func(ctx *gin.Context){
		ctx.JSON(http.StatusOK, ss.coordinatorPlaying(ctx.Param("id")))
	})

}
