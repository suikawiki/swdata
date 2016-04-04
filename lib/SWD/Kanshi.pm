package SWD::Kanshi;
use strict;
use warnings;
use JSON::PS;
use Path::Tiny;

my $RootPath = path (__FILE__)->parent->parent->parent;

our $Defs = json_bytes2perl $RootPath->child ('local/data/numbers-kanshi.json')->slurp;

our $ValueToDef = {};
for my $def (@{$Defs->{kanshi}}) {
  $def->{type} = 'kanshi';
  for (qw(
    ja_kun ja_kun_latn ja_on ja_on_latn kr kr_latn
    manchu manchu_latn name value vi zh_pinyin zh_zhuyin
  )) {
    $ValueToDef->{$def->{$_}} = $def if defined $def->{$_};;
  }
}
for my $def (@{$Defs->{earthly_branches}}) {
  $def->{type} = 'earthly_branch';
  for (qw(
    ja_kun ja_kun_latn ja_on ja_on_latn kr kr_latn
    manchu manchu_latn name vi zh_pinyin zh_zhuyin
  )) {
    $ValueToDef->{$def->{$_}} = $def;
  }
  $ValueToDef->{"12:$def->{value}"} = $def;
}
for my $def (@{$Defs->{heavenly_stems}}) {
  $def->{type} = 'heavenly_stem';
  for (qw(
    ja_kun ja_kun_latn ja_on ja_on_latn kr kr_latn
    manchu manchu_latn name vi zh_pinyin zh_zhuyin
  )) {
    $ValueToDef->{$def->{$_}} = $def;
  }
  $ValueToDef->{"10:$def->{value}"} = $def;
}

1;

=head1 LICENSE

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

=cut
