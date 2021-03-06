<t:macro name=undefined>
  <data>undefined</data>
</t:macro>

<t:macro name=null>
  <data>null</data>
</t:macro>

<t:macro name=boolean t:params=$value>
  <t:if x=$value>
    <t:class name="'boolean-true'">
    <a href=/boolean/true><data>true</></a>
  <t:else>
    <t:class name="'boolean-false'">
    <a href=/boolean/false><data>false</></a>
  </t:if>
</t:macro>

<t:macro name=number t:params="$value $inline?">
  <a pl:href="'/number/' . $value">
    <t:if x=$inline><t:class name="'inline'"></t:if>
    <data><t:text value=$value></data>
  </a>
</t:macro>

<t:macro name=lat t:params=$value>
  <a pl:href="'/lat/' . $value"><data><t:text value=$value></data></a>
</t:macro>

<t:macro name=lon t:params=$value>
  <a pl:href="'/lon/' . $value"><data><t:text value=$value></data></a>
</t:macro>

<t:macro name=latlon t:params="$lat $lon">
  <a pl:href="'/latlon/' . $lat . ',' . $lon"><data>(<t:text value=$lat>, <t:text value=$lon>)</data></a>
</t:macro>

<t:macro name=year t:params="$value">
  <a pl:href="'/year/' . sprintf '%04d', $value"><time><t:text value=$value></time></a>
</t:macro>

<t:macro name=ykanshi t:params="$year $inline?">
  <m:kanshi m:value="
    qw(庚 辛 壬 癸 甲 乙 丙 丁 戊 己)[$year % 10]
    .
    qw(申 酉 戌 亥 子 丑 寅 卯 辰 巳 午 未)[$year % 12]
  " m:inline=$inline />
  (<t:text value="($year - 4) % 60"><sub>0</sub>,
   <t:text value="($year - 4) % 60 + 1"><sub>1</sub>)
</t:macro>

<t:macro name=dkanshi t:params="$value $inline?">
  <m:kanshi m:value="
    qw(甲子 乙丑 丙寅 丁卯 戊辰 己巳 庚午 辛未 壬申 癸酉 甲戌 乙亥 丙子 丁丑 戊寅 己卯 庚辰 辛巳 壬午 癸未 甲申 乙酉 丙戌 丁亥 戊子 己丑 庚寅 辛卯 壬辰 癸巳 甲午 乙未 丙申 丁酉 戊戌 己亥 庚子 辛丑 壬寅 癸卯 甲辰 乙巳 丙午 丁未 戊申 己酉 庚戌 辛亥 壬子 癸丑 甲寅 乙卯 丙辰 丁巳 戊午 己未 庚申 辛酉 壬戌 癸亥)[$value]
  " m:inline=$inline />
  (<t:text value="$value"><sub>0</sub>,
   <t:text value="$value + 1"><sub>1</sub>)
</t:macro>

<t:macro name=yearmonth t:params="$year $month">
  <a pl:href="'/datetime/' . sprintf '%04d-%02d', $year, $month"><time><t:text value="sprintf '%04d-%02d', $year, $month"></time></a>
</t:macro>

<t:macro name=yearless-date t:params="$value">
  <t:my as=$date x="
    my (undef, undef, undef, $d, $m, undef) = gmtime $value;
    sprintf '--%02d-%02d', $m+1, $d;
  ">
  <a pl:href="'/datetime/' . $date"><time><t:text value=$date></time></a>
</t:macro>

<t:macro name=yearless-date-md t:params="$month $day">
  <t:my as=$date x="
    sprintf '--%02d-%02d', $month, $day;
  ">
  <a pl:href="'/datetime/' . $date"><time><t:text value=$date></time></a>
</t:macro>

<t:macro name=day t:params=$value>
  <a pl:href="'/datetime/' . $value"><time><t:text value=$value></time></a>
</t:macro>

<t:macro name=jd t:params="$value $formatted?">
  <a pl:href="'/datetime/jd:' . $value">
    <t:if x=$formatted>
      <time><t:text value="
        Web::DateTime->new_from_jd ($value)->to_global_date_and_time_string;
      "></time>
    <t:else>
      <data><t:text value=$value></data>
    </t:if>
  </a>
</t:macro>

<t:macro name=mjd t:params=$value>
  <a pl:href="'/datetime/mjd:' . $value"><data><t:text value=$value></data></a>
</t:macro>

<t:macro name=unixtime t:params="$value $formatted?">
  <a pl:href="'/datetime/' . $value">
    <t:if x=$formatted>
      <time><t:text value="
        Web::DateTime->new_from_unix_time ($value)->to_global_date_and_time_string;
      "></time>
    <t:else>
      <data><t:text value=$value></data>
    </t:if>
  </a>
</t:macro>

<t:macro name=tzoffset t:params=$tzvalue><a pl:href="'/tzoffset/' . $tzvalue->to_string"><data><t:text value="$tzvalue->to_string"></data></a></t:macro>

<t:macro name=era t:params="$key $text? $inline?">
  <t:my as=$def x="SWD::Eras::get_era_by_string ($key)">
  <a pl:href="'/era/' . $def->{id}">
    <t:if x=$inline><t:class name="'inline'"></t:if>
    <data pl:value="$def->{name}"><t:text value="$text // $def->{name}"></data>
  </a>
</t:macro>

<t:macro name=era-system t:params="$key $text? $inline?">
  <a pl:href="'/era/system/' . $key">
    <t:if x=$inline><t:class name="'inline'"></t:if>
    <data pl:value="$key"><t:text value="$text // $key"></data>
  </a>
</t:macro>

<t:macro name=kanshi t:params="$value $inline?">
  <a pl:href="'/kanshi/' . Wanage::URL::percent_encode_c $value">
    <t:if x=$inline><t:class name="'inline'"></t:if>
    <data><t:text value="
      my $def = $SWD::Kanshi::ValueToDef->{$value};
      $def->{name};
    "></data>
  </a>
</t:macro>

<t:macro name=codepoint t:params=$value>
  <a pl:href="sprintf '//chars.suikawiki.org/char/%04X', $value"><data><t:text value="$value <= 0x10FFFF ? sprintf 'U+%04X', $value : sprintf 'U-%08X', $value"></data></a>
</t:macro>

<t:macro name=lang t:params=$value>
  <a pl:href="'/lang/' . Wanage::URL::percent_encode_c $value"><t:text value=$value></a>
</t:macro>

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
