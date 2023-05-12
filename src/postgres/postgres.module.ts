import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Objects } from 'src/Models/Objects';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'psqldb',
      port: 5432,
      username: 'keshox',
      password: 'example',
      database: 'datadb',
      entities: [Objects],
      synchronize: true,
      autoLoadEntities: true,
    }),
  ],
})
export class PostgresModule {}
