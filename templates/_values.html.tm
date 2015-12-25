<t:macro name=boolean t:params=$value>
  <t:if x=$value>
    <a href=/boolean/true><data>true</></a>
  <t:else>
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

<t:macro name=year t:params=$value>
  <a pl:href="'/datetime/year:' . sprintf '%04d', $value"><time><t:text value=$value></time></a>
</t:macro>

<t:macro name=jd t:params=$value>
  <a pl:href="'/datetime/jd:' . $value"><data><t:text value=$value></data></a>
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

<t:macro name=tzoffset t:params=$value>
    <t:my as=$serialized x="
            my $v = $value < 0 ? -$value : $value;
            my $h = int ($v / 3600);
            my $m = int (($v - $h*3600) / 60);
            my $s = $v - $h*3600 - $m*60;
            if ($s == 0) {
              sprintf '%s%02d:%02d',
                  $value < 0 ? '-' : '+',
                  int $h,
                  int $m;
            } else {
              my $x = sprintf '%s%02d:%02d:%02d',
                  $value < 0 ? '-' : '+',
                  int $h,
                  int $m,
                  int $s;
              if ($s) {
                $s -= int $s;
                $s =~ s/^0//;
                $x .= $s;
              }
              $x;
            }
    ">
  <a pl:href="'/tzoffset/' . $serialized"><data><t:text value=$serialized></data></a>
</t:macro>

<t:macro name=codepoint t:params=$value>
  <a pl:href="sprintf '//chars.suikawiki.org/char/%04X', $value"><data><t:text value="$value <= 0x10FFFF ? sprintf 'U+%04X', $value : sprintf 'U-%08X', $value"></data></a>
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
