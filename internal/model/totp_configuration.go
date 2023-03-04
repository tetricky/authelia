package model

import (
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"image"
	"net/url"
	"strconv"
	"time"

	"github.com/pquerna/otp"
	"gopkg.in/yaml.v3"
)

type TOTPOptions struct {
	Algorithm  string   `json:"algorithm"`
	Algorithms []string `json:"algorithms"`

	Length  int   `json:"length"`
	Lengths []int `json:"lengths"`

	Period  int   `json:"period"`
	Periods []int `json:"periods"`
}

// TOTPConfiguration represents a users TOTP configuration row in the database.
type TOTPConfiguration struct {
	ID         int          `db:"id"`
	CreatedAt  time.Time    `db:"created_at"`
	LastUsedAt sql.NullTime `db:"last_used_at"`
	Username   string       `db:"username"`
	Issuer     string       `db:"issuer"`
	Algorithm  string       `db:"algorithm"`
	Digits     uint         `db:"digits"`
	Period     uint         `db:"period"`
	Secret     []byte       `db:"secret"`
}

type TOTPConfigurationJSON struct {
	CreatedAt  time.Time  `json:"created_at"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
	Issuer     string     `json:"issuer"`
	Algorithm  string     `json:"algorithm"`
	Digits     int        `json:"digits"`
	Period     int        `json:"period"`
}

// MarshalJSON returns the WebauthnDevice in a JSON friendly manner.
func (c TOTPConfiguration) MarshalJSON() (data []byte, err error) {
	o := TOTPConfigurationJSON{
		CreatedAt: c.CreatedAt,
		Issuer:    c.Issuer,
		Algorithm: c.Algorithm,
		Digits:    int(c.Digits),
		Period:    int(c.Period),
	}

	if c.LastUsedAt.Valid {
		o.LastUsedAt = &c.LastUsedAt.Time
	}

	return json.Marshal(o)
}

func (c *TOTPConfiguration) LastUsed() *time.Time {
	if c.LastUsedAt.Valid {
		return &c.LastUsedAt.Time
	}

	return nil
}

// URI shows the configuration in the URI representation.
func (c *TOTPConfiguration) URI() (uri string) {
	v := url.Values{}
	v.Set("secret", string(c.Secret))
	v.Set("issuer", c.Issuer)
	v.Set("period", strconv.FormatUint(uint64(c.Period), 10))
	v.Set("algorithm", c.Algorithm)
	v.Set("digits", strconv.Itoa(int(c.Digits)))

	u := url.URL{
		Scheme:   "otpauth",
		Host:     "totp",
		Path:     "/" + c.Issuer + ":" + c.Username,
		RawQuery: v.Encode(),
	}

	return u.String()
}

// UpdateSignInInfo adjusts the values of the TOTPConfiguration after a sign in.
func (c *TOTPConfiguration) UpdateSignInInfo(now time.Time) {
	c.LastUsedAt = sql.NullTime{Time: now, Valid: true}
}

// Key returns the *otp.Key using TOTPConfiguration.URI with otp.NewKeyFromURL.
func (c *TOTPConfiguration) Key() (key *otp.Key, err error) {
	return otp.NewKeyFromURL(c.URI())
}

// Image returns the image.Image of the TOTPConfiguration using the Image func from the return of TOTPConfiguration.Key.
func (c *TOTPConfiguration) Image(width, height int) (img image.Image, err error) {
	var key *otp.Key

	if key, err = c.Key(); err != nil {
		return nil, err
	}

	return key.Image(width, height)
}

// MarshalYAML marshals this model into YAML.
func (c *TOTPConfiguration) MarshalYAML() (any, error) {
	o := TOTPConfigurationData{
		CreatedAt:  c.CreatedAt,
		LastUsedAt: c.LastUsed(),
		Username:   c.Username,
		Issuer:     c.Issuer,
		Algorithm:  c.Algorithm,
		Digits:     c.Digits,
		Period:     c.Period,
		Secret:     base64.StdEncoding.EncodeToString(c.Secret),
	}

	return yaml.Marshal(o)
}

// UnmarshalYAML unmarshalls YAML into this model.
func (c *TOTPConfiguration) UnmarshalYAML(value *yaml.Node) (err error) {
	o := &TOTPConfigurationData{}

	if err = value.Decode(o); err != nil {
		return err
	}

	if c.Secret, err = base64.StdEncoding.DecodeString(o.Secret); err != nil {
		return err
	}

	c.CreatedAt = o.CreatedAt
	c.Username = o.Username
	c.Issuer = o.Issuer
	c.Algorithm = o.Algorithm
	c.Digits = o.Digits
	c.Period = o.Period

	if o.LastUsedAt != nil {
		c.LastUsedAt = sql.NullTime{Valid: true, Time: *o.LastUsedAt}
	}

	return nil
}

// TOTPConfigurationData is used for marshalling/unmarshalling tasks.
type TOTPConfigurationData struct {
	CreatedAt  time.Time  `yaml:"created_at"`
	LastUsedAt *time.Time `yaml:"last_used_at"`
	Username   string     `yaml:"username"`
	Issuer     string     `yaml:"issuer"`
	Algorithm  string     `yaml:"algorithm"`
	Digits     uint       `yaml:"digits"`
	Period     uint       `yaml:"period"`
	Secret     string     `yaml:"secret"`
}

// TOTPConfigurationExport represents a TOTPConfiguration export file.
type TOTPConfigurationExport struct {
	TOTPConfigurations []TOTPConfiguration `yaml:"totp_configurations"`
}
