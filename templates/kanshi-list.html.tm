<html t:params="$app" lang=en>
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title>Stems and branches
  </t:include>
<body>
  <t:include path=_site_header.html.tm />

  <header class=page>
  <hgroup>
    <h1>Stems and branches</h1>
  </>
  </header>

  <menu class=toc />

  <page-main>
    
  <section id=stems>
    <h1>Heavenly stems (十干, celestial stems)</h1>

    <ul class=item-list>
      <t:for as=$def x="$SWD::Kanshi::Defs->{heavenly_stems}">
        <li><m:kanshi m:value="$def->{name}" />
      </t:for>
    </ul>
  </section>

  <section id=branches>
    <h1>Earthly branches (十二支, 地支)</h1>

    <ul class=item-list>
      <t:for as=$def x="$SWD::Kanshi::Defs->{earthly_branches}">
        <li><m:kanshi m:value="$def->{name}" />
      </t:for>
    </ul>
  </section>

  <section id=kanshi>
    <h1>Kanshi (干支, 十干十二支, 六十花甲, sexagenary cycle)</h1>

    <ul class=item-list>
      <t:for as=$def x="$SWD::Kanshi::Defs->{kanshi}">
        <li><m:kanshi m:value="$def->{name}" />
      </t:for>
    </ul>
  </section>

  <p>Extracted from
  <a href=https://github.com/manakai/data-locale/blob/master/data/numbers/kanshi.json>a
  JSON data file</a>
  (<a href=https://github.com/manakai/data-locale/blob/master/doc/numbers-kanshi.txt>documentation</a>).

  </page-main>

  <page-side>
    <m:ads />
  </page-side>
  <t:include path=_site_footer.html.tm />

<!--

Copyright 2016-2022 Wakaba <wakaba@suikawiki.org>.

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
