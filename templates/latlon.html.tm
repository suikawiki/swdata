<html t:params="$app $lat $lon" lang=en>
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title><t:text value="$lat">,<t:text value=$lon> (latitude and longitude)
  </t:include>
<body>
  <t:include path=_site_header.html.tm />

<section>
  <hgroup>
    <h1><data><t:text value="$lat"></>,<data><t:text value=$lon></></h1>
    <h2>Latitude and longitude</h2>
  </>

  <section id=components>
    <h1>Components</h1>

  <table class=nv>
    <tbody>
      <tr>
        <th>Latitude
        <td><m:lat m:value=$lat />
      <tr>
        <th>Longitude
        <td><m:lon m:value=$lon />
  </table>

  </section>

  <section id=serializations>
    <h1>Serializations</h1>

  <table class=nv>
    <tbody>
      <tr>
        <th>DEG
        <td><a pl:href="sprintf '/latlon/%f,%f', $lat, $lon" rel=bookmark><t:text value="sprintf '%f,%f', $lat, $lon"></a>
      </tr>
      <t:my as=$lat_dms x="
        my $v = $lat > 0 ? $lat : -$lat;
        my $w = ($v - int $v) * 60;
        [$lat < 0 ? -1 : 1, int $v, int $w, ($w - int $w) * 60];
      ">
      <t:my as=$lon_dms x="
        my $v = $lon > 0 ? $lon : -$lon;
        my $w = ($v - int $v) * 60;
        [$lon < 0 ? -1 : 1, int $v, int $w, ($w - int $w) * 60];
      ">
      <tr lang=en>
        <th>DMS (English)
        <td><a pl:href="sprintf '/latlon/%d.%d.%f%s,%d.%d.%f%s',
                            $lat_dms->[1], $lat_dms->[2], $lat_dms->[3], $lat_dms->[0] < 0 ? 'S' : 'N',
                            $lon_dms->[1], $lon_dms->[2], $lon_dms->[3], $lon_dms->[0] < 0 ? 'W' : 'E'" rel=bookmark><t:text value="
          sprintf q{%s° %s' %s'' %s},
              $lat_dms->[1],
              $lat_dms->[2],
              ($lat_dms->[3] == int $lat_dms->[3] ? sprintf '%d', $lat_dms->[3] : sprintf '%f', $lat_dms->[3]),
              $lat_dms->[0] < 0 ? 'S' : 'N';
        "> <t:text value="
          sprintf q{%s° %s' %s'' %s},
              $lon_dms->[1],
              $lon_dms->[2],
              ($lon_dms->[3] == int $lon_dms->[3] ? sprintf '%d', $lon_dms->[3] : sprintf '%f', $lon_dms->[3]),
              $lon_dms->[0] < 0 ? 'W' : 'E';
        "></a>
      <tr lang=ja>
        <th>DMS (日本語)
        <td><a pl:href="sprintf '/latlon/%d.%d.%f%s,%d.%d.%f%s',
                            $lat_dms->[1], $lat_dms->[2], $lat_dms->[3], $lat_dms->[0] < 0 ? 'S' : 'N',
                            $lon_dms->[1], $lon_dms->[2], $lon_dms->[3], $lon_dms->[0] < 0 ? 'W' : 'E'" rel=bookmark><t:text value="
          sprintf q{%s%s度%s分%s秒},
              $lat_dms->[0] < 0 ? '南緯' : '北緯',
              $lat_dms->[1],
              $lat_dms->[2],
              ($lat_dms->[3] == int $lat_dms->[3] ? sprintf '%d', $lat_dms->[3] : sprintf '%f', $lat_dms->[3]);
        "><t:text value="
          sprintf q{%s%s度%s分%s秒},
              $lon_dms->[0] < 0 ? '西経' : '東経',
              $lon_dms->[1],
              $lon_dms->[2],
              ($lon_dms->[3] == int $lon_dms->[3] ? sprintf '%d', $lon_dms->[3] : sprintf '%f', $lon_dms->[3]);
        "></a>
  </table>

  </section>

  <section id=links>
    <h1>Links</h1>

    <ul>
      <li><a pl:href="sprintf 'https://www.google.com/maps/@%f,%f,8z', $lat, $lon">Google Maps</a>
    </ul>
  </section>

</section>

  <m:ads />
  <t:include path=_site_footer.html.tm />

<!--

Copyright 2015 Wakaba <wakaba@suikawiki.org>.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
Affero General Public License for more details.

You does not have received a copy of the GNU Affero General Public
License along with this program, see <http://www.gnu.org/licenses/>.

-->
