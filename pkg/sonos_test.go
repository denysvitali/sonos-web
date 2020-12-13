package sonosweb

import (
	"fmt"
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestDiscover(t *testing.T){
	sonosDevices, err := Discover()
	assert.Nil(t, err)
	for _, device := range sonosDevices {
		fmt.Printf("Room: %v\n", device.RoomName())
		zgs, err :=  device.GetZoneGroupState()
		assert.Nil(t, err)
		for _, group := range zgs.ZoneGroups {
			for _, groupMember := range group.ZoneGroupMember {
				fmt.Printf("groupMember: %+v\n", groupMember)
			}
		}
	}
}
