package sonos_server

import (
	"encoding/xml"
	"github.com/denysvitali/sonos"
	avtransport "github.com/denysvitali/sonos/AVTransport"
	"strings"
)

type Device struct {
	Id   string `json:"id"`
	Name string `json:"name"`
}

type Coordinator struct {
	Id       string   `json:"id"`
	ZoneName string   `json:"zone_name"`
	Members  []Device `json:"members"`
}

type CoordinatorsResponse struct {
	Coordinators []Coordinator `json:"coordinators"`
}

func (ss *SonosServer) getCoordinator(id string) *Coordinator {
	d := ss.getDeviceById(id)
	if d == nil {
		return nil
	}

	return ss.getCoordinatorFromDevice(d)
}

type MediaInfo struct {
	Medium   string        `json:"medium"`
	NrTracks uint32        `json:"nr_tracks"`
	Position *PositionInfo `json:"position"`
	Current  TrackInfo     `json:"current"`
	Next     TrackInfo     `json:"next"`
}

func (ss *SonosServer) coordinatorPlaying(id string) *MediaInfo {
	d := ss.getDeviceById(id)
	if d == nil {
		return nil
	}

	mediaInfo, err := d.AVTransport.GetMediaInfo(&avtransport.GetMediaInfoArgs{})
	if err != nil {
		ss.log.Errorf("unable to get coordinator media info: %v", err)
		return nil
	}

	positionInfo, err := d.AVTransport.GetPositionInfo(&avtransport.GetPositionInfoArgs{})
	return ss.parseMediaInfo(mediaInfo, positionInfo)
}

type TrackMetadata struct {
	Title    *string `json:"title"`
	Artist   *string `json:"artist"`
	CoverURL *string `json:"cover_url"`
	Album    *string `json:"album"`
	Type     *string `json:"type"`
}

type TrackInfo struct {
	Uri      *string         `json:"uri"`
	Metadata *TrackMetadata `json:"metadata"`
}

type PositionInfo struct {
	Track *TrackMetadata `json:"track"`
}

func (ss *SonosServer) parseMediaInfo(info *avtransport.GetMediaInfoResponse, positionInfo *avtransport.GetPositionInfoResponse) *MediaInfo {
	if info == nil {
		return nil
	}

	var currentUri *string = nil
	var nextUri *string = nil
	
	if info.CurrentURI != "" {
		currentUri = &info.CurrentURI
	}
	
	if info.NextURI != "" {
		nextUri = &info.NextURI
	}

	return &MediaInfo{
		Current: TrackInfo{
			Uri:      currentUri,
			Metadata: ss.parseTrackMetadata(info.CurrentURIMetaData),
		},
		NrTracks: info.NrTracks,
		Medium:   info.PlayMedium,
		Next: TrackInfo{
			Uri:      nextUri,
			Metadata: ss.parseTrackMetadata(info.NextURIMetaData),
		},
		Position: &PositionInfo{
			Track: ss.parseTrackMetadata(positionInfo.TrackMetaData),
		},
	}
}

type DCMIRes struct {
	ProtocolInfo string `xml:"protocolInfo"`
	Content      string `xml:",any"`
	Duration     string `xml:"duration,attr"`
}

type DCMIItem struct {
	Name        xml.Name  `xml:"item"`
	Id          string    `xml:"id,attr"`
	ParentId    string    `xml:"parentID,attr"`
	Restricted  bool      `xml:"restricted,attr"`
	Title       *string   `xml:"title"`
	UpnpClass   *string   `xml:"class"`
	Res         []DCMIRes `xml:"res"`
	Artist      *string   `xml:"creator"`
	Album       *string   `xml:"album"`
	AlbumArtUri *string   `xml:"albumArtURI"`
}

type DCMI struct {
	Name xml.Name   `xml:"DIDL-Lite"`
	Item []DCMIItem `xml:"item"`
}

func (ss *SonosServer) parseTrackMetadata(data string) *TrackMetadata {
	if data == "" {
		return nil
	}
	var dcmi DCMI
	err := xml.Unmarshal([]byte(data), &dcmi)
	if err != nil {
		ss.log.Errorf("unable to decode DCMI: %v", err)
		return nil
	}
	return &TrackMetadata{
		Title:    dcmi.Item[0].Title,
		Artist:   dcmi.Item[0].Artist,
		Album:    dcmi.Item[0].Album,
		CoverURL: dcmi.Item[0].AlbumArtUri,
		Type:     dcmi.Item[0].UpnpClass,
	}
}

func (ss *SonosServer) getDeviceById(id string) *sonos.ZonePlayer {
	for _, d := range ss.devices {
		if d.Root.Device.UDN == "uuid:"+id {
			return d
		}
	}
	return nil
}

func (ss *SonosServer) createCoordinatorsResponse() CoordinatorsResponse {
	var coordinators []Coordinator

	for _, d := range ss.devices {
		coordinator := ss.getCoordinatorFromDevice(d)
		if coordinator == nil {
			continue
		}
		coordinators = append(coordinators, *coordinator)
	}
	return CoordinatorsResponse{
		Coordinators: coordinators,
	}
}

func (ss *SonosServer) getCoordinatorFromDevice(d *sonos.ZonePlayer) *Coordinator {
	zgs, err := d.GetZoneGroupState()
	if err != nil {
		ss.log.Errorf("unable to get ZoneGroupState for %s", d.SerialNum())
		return nil
	}
	zoneGroup := zgs.ZoneGroups[0]

	var zoneMembers []Device
	for _, m := range zoneGroup.ZoneGroupMember {
		zoneMembers = append(zoneMembers, Device{
			Id:   m.UUID,
			Name: m.ZoneName,
		})
	}

	udnNoUuid := strings.Replace(d.Root.Device.UDN, "uuid:", "", -1)
	return &Coordinator{
		Id:       udnNoUuid,
		ZoneName: d.RoomName(),
		Members:  zoneMembers,
	}
}
