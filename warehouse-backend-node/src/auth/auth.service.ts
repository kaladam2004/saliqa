import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { IsString } from 'class-validator';
import { Admin } from '../admin/admin.entity';
import { User } from '../user/user.entity';
import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../common/enums/event-type.enum';

export class LoginDto {
  @IsString() username: string;
  @IsString() password: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin) private adminRepo: Repository<Admin>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
    private eventLogService: EventLogService,
  ) {}

  async login(dto: LoginDto) {
    // Check users (sales reps) table first — users can never accidentally get admin access
    const user = await this.userRepo.findOne({
      where: { username: dto.username, deleted: false },
    });
    if (user) {
      if (!(await bcrypt.compare(dto.password, user.password))) {
        throw new BadRequestException('Invalid credentials');
      }
      const token = this.generateToken(user.username, 'USER', user.id);
      const refresh = this.generateRefresh(user.username);
      await this.eventLogService.log(user.id, 'USER', user.username, EventType.LOGIN, 'User logged in');
      return {
        accessToken: token,
        refreshToken: refresh,
        tokenType: 'Bearer',
        id: user.id,
        username: user.username,
        fullname: user.fullname,
        role: 'USER',
      };
    }

    // Check admins table
    const admin = await this.adminRepo.findOne({
      where: { username: dto.username, deleted: false },
    });
    if (admin) {
      if (!(await bcrypt.compare(dto.password, admin.password))) {
        throw new BadRequestException('Invalid credentials');
      }
      const token = this.generateToken(admin.username, admin.role, admin.id);
      const refresh = this.generateRefresh(admin.username);
      await this.eventLogService.log(admin.id, 'ADMIN', admin.username, EventType.LOGIN, 'Admin logged in');
      return {
        accessToken: token,
        refreshToken: refresh,
        tokenType: 'Bearer',
        id: admin.id,
        username: admin.username,
        fullname: admin.fullname,
        role: admin.role,
      };
    }

    throw new BadRequestException('Invalid credentials');
  }

  private generateToken(username: string, role: string, id: number): string {
    return this.jwtService.sign(
      { sub: username, role, id },
      { expiresIn: parseInt(process.env.JWT_EXPIRATION || '86400') },
    );
  }

  private generateRefresh(username: string): string {
    return this.jwtService.sign(
      { sub: username },
      { expiresIn: parseInt(process.env.JWT_REFRESH_EXPIRATION || '604800') },
    );
  }
}
