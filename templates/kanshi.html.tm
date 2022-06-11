<html t:params="$app $def" lang=en>
<t:include path=_macro.html.tm />
<t:include path=_values.html.tm />
<head>
  <t:include path=_head.html.tm>
    <t:field name=title><t:text value="$def->{name}"> (<t:text value="{
      earthly_branch => 'Earthly branch',
      heavenly_stem => 'Heavenly stem',
      kanshi => 'Stem and branch',
    }->{$def->{type}}">)
  </t:include>
<body>
  <t:include path=_site_header.html.tm />

  <header class=page>
    <hgroup>
    <h1><t:text value="$def->{name}"></h1>
    <h2><t:text value="{
      earthly_branch => 'Earthly branch',
      heavenly_stem => 'Heavenly stem',
      kanshi => 'Stem and branch',
    }->{$def->{type}}"></h2>
    </>
  </header>

  <menu class=toc />

  <page-main>
    
  <section id=names>
    <h1>Name</h1>

    <table class=nv>
      <tbody>
        <tr>
          <th>Name
          <td><data><t:text value="$def->{name}"></>
        <t:if x="defined $def->{zh_pinyin}">
          <tr>
            <th>Chinese (Pinyin)
            <td><data><t:text value="$def->{zh_pinyin}"></>
        </t:if>
        <t:if x="defined $def->{zh_zhuyin}">
          <tr>
            <th>Chinese (Bopomofo)
            <td><data><t:text value="$def->{zh_zhuyin}"></>
        </t:if>
        <tr>
          <th>Japanese on-yomi
          <td><data><t:text value="$def->{ja_on}"></>
            (<data><t:text value="$def->{ja_on_latn}"></>)
        <tr>
          <th>Japanese kun-yomi
          <td><data><t:text value="$def->{ja_kun}"></>
            (<data><t:text value="$def->{ja_kun_latn}"></>)
        <t:if x="defined $def->{manchu}">
          <tr>
            <th>Manchu
            <td><data><t:text value="$def->{manchu}"></>
              (<data><t:text value="$def->{manchu_latn}"></>)
        </t:if>
        <tr>
          <th>Vietnamese
          <td><data><t:text value="$def->{vi}"></>
        <tr>
          <th>Korean
          <td><data><t:text value="$def->{kr}"></>
            (<data><t:text value="$def->{kr_latn}"></>)
    </table>
  </section>

  <section id=values>
    <h1>Values</h1>

    <table class=nv>
      <tbody>
        <tr>
          <th>Number (0-indexed)
          <td><m:number m:value="$def->{value}-1" />
        </tr>
        <tr>
          <th>Number (1-indexed)
          <td><m:number m:value="$def->{value}" />
        </tr>
        <t:if x="$def->{type} eq 'kanshi'">
          <tr>
            <th>Heavenly stem
            <td><m:kanshi m:value="substr $def->{name}, 0, 1" />
          <tr>
            <th>Earthly branch
            <td><m:kanshi m:value="substr $def->{name}, 1, 1" />
          <tr>
            <th>Years
            <td>
              <t:for as=$x x="[-12..40]" t:space=preserve>
                <m:year m:value="$def->{value} + $x * 60 + 3" />
              </t:for>
        <t:elsif x="$def->{type} ne 'kanshi'">
          <tr>
            <th>Stems and branches
            <td>
              <t:if x="$def->{type} eq 'earthly_branch'">
                <t:for as=$x x="[0..4]" t:space=preserve>
                  <m:kanshi m:value="($def->{value} + $x * 12 - 1) % 60 + 1" />
                </t:for>
              <t:elsif x="$def->{type} eq 'heavenly_stem'">
                <t:for as=$x x="[0..5]" t:space=preserve>
                  <m:kanshi m:value="($def->{value} + $x * 10 - 1) % 60 + 1" />
                </t:for>
              </t:if>
        </t:if>
    </table>
  </section>

  <section id=links>
    <h1>Links</h1>

    <table class=nv>
      <tbody>
        <tr>
          <th>Wikipedia
          <td>
            <t:if x="defined $def->{wref_ja}">
              <a pl:href="'https://ja.wikipedia.org/wiki/' . Wanage::URL::percent_encode_c $def->{wref_ja}" lang=ja>日本語</a>
            </t:if>
            <t:if x="defined $def->{wref_zh}">
              <a pl:href="'https://zh.wikipedia.org/wiki/' . Wanage::URL::percent_encode_c $def->{wref_zh}" lang=zh>中文</a>
            </t:if>
            <t:if x="defined $def->{wref_ko}">
              <a pl:href="'https://ko.wikipedia.org/wiki/' . Wanage::URL::percent_encode_c $def->{wref_ko}" lang=ko>한국어</a>
            </t:if>
            <t:if x="defined $def->{wref_en}">
              <a pl:href="'https://en.wikipedia.org/wiki/' . Wanage::URL::percent_encode_c $def->{wref_en}" lang=en>English</a>
            </t:if>
        <tr>
          <th>Previous
          <td><m:kanshi m:value="
            my $v = $def->{value}-1;
            $def->{type} eq 'earthly_branch' ? '12:'.(($v-1)%12+1) :
            $def->{type} eq 'heavenly_stem'  ? '10:'.(($v-1)%10+1) :
            $def->{type} eq 'kanshi'         ?       (($v-1)%60+1) : '';
          "/>
        <tr>
          <th>Next
          <td><m:kanshi m:value="
            my $v = $def->{value}+1;
            $def->{type} eq 'earthly_branch' ? '12:'.(($v-1)%12+1) :
            $def->{type} eq 'heavenly_stem'  ? '10:'.(($v-1)%10+1) :
            $def->{type} eq 'kanshi'         ?       (($v-1)%60+1) : '';
          "/>
    </table>
  </section>

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
