# -*- perl -*-
use strict;
use warnings;
use SWD::Web;

use SWD::Eras;
use SWD::Holidays;
use SWD::Days;

$ENV{LANG} = 'C';
$ENV{TZ} = 'UTC';

$SWD::Web::CORSAllowedOrigins = {map { $_ => 1 } split /\s+/, $ENV{SWD_CORS_ALLOWED_ORIGINS} // ''};

return SWD::Web->psgi_app;

=head1 LICENSE

Copyright 2015-2023 Wakaba <wakaba@suikawiki.org>.

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
