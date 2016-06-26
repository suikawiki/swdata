<html t:params="$app" lang=en>
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title>Years
  </t:include>
<body>
  <t:include path=_site_header.html.tm />

<section>
  <hgroup>
    <h1>Years</>
  </>

  <menu class=nearby><a pl:href="'https://wiki.suikawiki.org/n/year'">Notes</a></menu>

  <menu class=toc />

  <t:for as=$m x="[-2 .. 2]">
    <section pl:id="'years-' . $m">
      <h1>Years <t:text value="$m * 1000"> - <t:text value="$m * 1000 + 999"></h1>

      <ul class="item-list">
        <t:for as=$year x="[$m * 1000 .. ($m * 1000 + 999)]">
          <li><m:year m:value=$year />
        </t:for>
      </ul>
    </section>
  </t:for>

</section>

  <m:ads />
  <t:include path=_site_footer.html.tm />

<!--

Copyright 2016 Wakaba <wakaba@suikawiki.org>.

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
