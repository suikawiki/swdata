<html t:params="$app $value" lang=en>
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title><t:text value="$value ? 'true' : 'false'"> (boolean)
  </t:include>
<body>
  <t:include path=_site_header.html.tm />
  
  <header class=page>
  <hgroup>
    <h1><data><t:text value="$value ? 'true' : 'false'"></></h1>
    <h2>Boolean</h2>
  </>
  </header>

  <nav class=content-links>
  <menu class=nearby><a pl:href="'https://wiki.suikawiki.org/n/'.Wanage::URL::percent_encode_c ($value ? 'true' : 'false')">Notes</a></menu>
  </nav>

  <menu class=toc />

  <page-main>

  <section id=serializations>
    <h1>Serializations</h1>

    <table class=nv>
      <tbody>
        <tr>
          <th>JSON
          <td><code><t:text value="$value ? 'true' : 'false'"></>
    </table>
  </section>

  <section id=operations>
    <h1>Operations</h1>

    <table class=nv>
      <tbody>
        <tr>
          <th>not
          <td><m:boolean m:value=!$value />
    </table>
  </section>

  </page-main>

  <page-side>
    <m:ads />
  </page-side>
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
