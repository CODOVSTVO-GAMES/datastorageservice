import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Objects {
    @PrimaryGeneratedColumn({type: "bigint"})
    id: number;

    @Column()
    userId: string

    @Column()
    className: string

    @Column({type:"text"})
    data: string
}