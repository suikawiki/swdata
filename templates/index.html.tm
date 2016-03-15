<html lang=en>
<t:include path=_macro.html.tm />
<head>
  <t:include path=_head.html.tm />
<body>
  <t:include path=_site_header.html.tm />

  <section>
    <hgroup>
      <h1>Data types</h1>
    </hgroup>

    <ul>
      <li><a href=/boolean/true>Booleans</a>
      <li><a href=/number/0>Numbers</a>
        <form action=javascript: onsubmit="
          location.href = '/number/' + elements.number.value;
          return false;
        ">
          <input type=number name=number step=any value=0 required>
          <button type=submit>Go</button>
        </form>
      <li><a href=/lat/0>Latitudes</a>
        <form action=javascript: onsubmit="
          location.href = '/lat/' + elements.number.value;
          return false;
        ">
          <input type=number name=number step=any value=0 min=0 max=90 required>
          <button type=submit>Go</button>
        </form>
      <li><a href=/lon/0>Longitudes</a>
        <form action=javascript: onsubmit="
          location.href = '/lon/' + elements.number.value;
          return false;
        ">
          <input type=number name=number step=any value=0 min=-180 max=180 required>
          <button type=submit>Go</button>
        </form>
      <li><a href=/latlon/0,0>Latitudes and longitudes</a>
        <form action=javascript: onsubmit="
          location.href = '/latlon/' + elements.lat.value + ',' + elements.lon.value;
          return false;
        ">
          <input type=number name=lat step=any value=0 min=0 max=90 required title=Latitude>
          <input type=number name=lon step=any value=0 min=-180 max=180 required title=Longitude>
          <button type=submit>Go</button>
        </form>
      <li><a href=/tzoffset/+00:00>Time zone offsets</a>
      <li><a href=/datetime/now>Dates and times</a>
        <form action=javascript: onsubmit="
          location.href = '/datetime/' + elements.number.value;
          return false;
        ">
          <input type=date name=number step=any required>
          <button type=submit>Go</button>
        </form>
      <li><a href=/era>Eras</a>
      <li><a href=/era/system>Era systems</a>
      <li><a href=https://chars.suikawiki.org>Characters</a>
        <form action=https://chars.suikawiki.org/string>
          <input name=s required>
          <button type=submit>Go</button>
        </form>
      <li><a href=/lang>Language tags</a>
        <form action=/lang>
          <input name=tag required>
          <button type=submit>Go</>
        </form>
    </ul>
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
License along with this program, see <https://www.gnu.org/licenses/>.

-->
