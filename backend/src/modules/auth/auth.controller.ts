import { Body, Controller, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { AuthService, AuthTokens } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { requireUserId } from '../../common/tenant/tenant.util';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthTokens> {
    return this.authService.login(dto.email, dto.password);
  }

  @Patch('senha')
  @HttpCode(HttpStatus.OK)
  changePassword(@Body() dto: ChangePasswordDto): Promise<{ ok: true }> {
    return this.authService.changePassword(requireUserId(), dto.senhaAtual, dto.novaSenha);
  }
}
