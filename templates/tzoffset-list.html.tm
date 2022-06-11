<html t:params="$app" lang=en>
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title>Time zone offsets
  </t:include>
<body>
  <t:include path=_site_header.html.tm />

  <header class=page>
    <hgroup>
      <h1>Time zone offsets</>
    </>
  </header>

  <nav class=content-links>
  <menu class=nearby><a pl:href="'https://wiki.suikawiki.org/n/time%20zone%20offsets'">Notes</a></menu>
  </nav>
  
  <menu class=toc />

  <page-main>

  <section>
    <h1>Standard time</h1>

    <ul>
      <li><a href=/tzoffset/+00:00>UTC (<code>+00:00</code>)</a>
    </ul>
  </section>

  <section>
    <h1>Offsets</h1>

    <t:for as=$hour x="[-14..14]">
      <table>
        <t:my as=$offsets x="[map { ($hour * 60 + $_) * 60 } 0, 15, 30, 45]">
        <tr>
          <th>Offset</>
          <t:for as=$offset x=$offsets>
            <td>
              <m:tzoffset m:tzvalue="TZOffset->new_from_seconds ($offset)" />
          </t:for>
        <tr>
          <th>Longitude</>
          <t:for as=$offset x=$offsets>
            <td>
              <m:lon m:value="$offset / 60 / 4"/>
          </t:for>
      </table>
    </t:for>

  </section>

  </page-main>

  <page-side>
    <m:ads />
  </page-side>
  <t:include path=_site_footer.html.tm />

<!--

Copyright 2016-20122 Wakaba <wakaba@suikawiki.org>.

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
