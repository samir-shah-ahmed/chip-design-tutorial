module tb;
reg [3:0] a, b;
  wire [3:0] sum;
  add #(.WIDTH(4)) dut(.a(a), .b(b), .sum(sum));
  initial begin
    a = 4'h3; b = 4'h4; #1;
    if (sum === 4'h7) $display("PASS sum=%h", sum);
    else $display("FAIL sum=%h expect 7", sum);
    $finish;
  end
endmodule
