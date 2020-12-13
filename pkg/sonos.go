package sonosweb

import (
	"github.com/denysvitali/sonos"
	"time"
)

const UdpPort uint16 = 14480

func Discover() ([]*sonos.ZonePlayer, error) {
	sonosDevices := make([]*sonos.ZonePlayer, 0)
	son, err := sonos.NewSonos(UdpPort)
	if err != nil {
		return sonosDevices, err
	}
	defer son.Close()

	found, _ := son.Search()
	to := time.After(1 * time.Second)
	for {
		select {
		case <-to:
			return sonosDevices, nil
		case zp := <-found:
			sonosDevices = append(sonosDevices, zp)
		}
	}
}
