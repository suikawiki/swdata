<html t:params="$app $value" lang=en>
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title><t:text value="$value ? 'true' : 'false'"> (boolean)
  </t:include>
<body>
  <t:include path=_site_header.html.tm />

<section>
  <hgroup>
    <h1><data><t:text value="$value ? 'true' : 'false'"></></h1>
    <h2>Boolean</h2>
  </>

  <table>
    <caption>Serializations</caption>
    <tbody>
      <tr>
        <th>JSON
        <td><code><t:text value="$value ? 'true' : 'false'"></>
  </table>

  <table>
    <caption>Operations</caption>
    <tbody>
      <tr>
        <th>not
        <td><m:boolean m:value=!$value />
  </table>
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
